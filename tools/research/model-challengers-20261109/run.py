"""Run the fixed challengers in a new evidence directory using frozen sources."""
import argparse
import csv
import hashlib
import importlib.util
import io
import json
import math
import os
from collections import Counter
from pathlib import Path

for variable in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[variable] = "1"
import numpy as np

import cmp_challenger
import sarima_challenger

SOURCES = {
    "snapshot.json": "bf574e642abdee4813b08d62179daf693c3929d56646afd5d099ed966bb561ac",
    "SYNTHETIC_monthly.csv": "49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7",
    "run.py": "0295a99ac81c94c6992358d6aea0dd9a8a8fce90e7d693a865d43366561b9d47",
    "evidence-manifest.json": "5b84d70a891aa6b5e391a11d8c5aed1d50c2af8b96325e913805e31cf5f1ed56",
}
SCORE_KEYS = ("p_exact", "p_near", "exact", "near", "brier", "brier_near", "nll", "rps",
              "coverage80", "coverage95", "width80", "width95", "mass80", "mass95")
COUNT_MODELS = ("sarima", "ridge", "previous")
PROB_MODELS = ("pooled", "local")


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify(path, expected):
    data = path.read_bytes()
    if digest(data) != expected:
        raise ValueError(f"Frozen hash mismatch: {path}")
    return data


def csv_rows(raw):
    return list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))


def unique(rows, key):
    rows = list(rows)
    index = {key(row): row for row in rows}
    if len(index) != len(rows):
        raise ValueError("Duplicate frozen keys")
    return index


def prior_pairs(scopes, origin):
    return [
        {"origin": i, "barangay": scope["barangay"],
         "mean": scope["outputs"][i]["sarima"]["prediction"], "actual": scope["history"][i]}
        for scope in scopes for i in range(31, origin) if scope["outputs"][i]["sarima"]["usable"]
    ]


def load_inputs(project, original, pooled):
    folder = project / "server/data/seasonal-sarima-6200"
    paths = {folder / name: SOURCES[name] for name in ("snapshot.json", "SYNTHETIC_monthly.csv")}
    paths[original / "run.py"] = SOURCES["run.py"]
    paths[pooled / "evidence-manifest.json"] = SOURCES["evidence-manifest.json"]
    sources = {p.name: verify(p, h) for p, h in paths.items()}
    manifest = json.loads(sources["evidence-manifest.json"])
    for name in ("fits.csv", "matched-targets.csv", "availability.csv", "october.csv", "POLICY.md", "research.py"):
        paths[pooled / name] = manifest[name]
        sources[name] = verify(pooled / name, manifest[name])

    snapshot = json.loads(sources["snapshot.json"])
    counts = csv_rows(sources["SYNTHETIC_monthly.csv"])
    by_cell = unique(counts, lambda r: (r["Disease"], r["Barangay"], r["Date"]))
    if len(by_cell) != 3150 or sum(int(r["Cases"]) for r in counts) != 6200:
        raise ValueError("Unexpected demonstration dataset dimensions")
    scopes = snapshot["scopes"]
    if (len(scopes) != 70 or set(unique(scopes, lambda s: (s["disease"], s["barangay"])))
            != {(d, b) for d in snapshot["diseases"] for b in snapshot["barangays"]}):
        raise ValueError("Unexpected frozen scope list")
    for scope in scopes:
        history = scope["history"]
        key = scope["disease"], scope["barangay"]
        if len(history) != 45 or history != [int(by_cell[*key, date]["Cases"]) for date in snapshot["dates"]]:
            raise ValueError("Frozen history disagrees with the monthly CSV")
        scope["outputs"] = unique(scope["outputs"], lambda o: o["n"])
        for i in range(31, 46):
            row = scope["outputs"][i]
            prefix = json.dumps(history[:i], separators=(",", ":")).encode()
            target = snapshot["dates"][i] if i < 45 else "2026-10"
            if row["training_digest"] != digest(prefix) or row["target"] != target:
                raise ValueError("Frozen SARIMA prefix or target mismatch")
            if i < 45 and row["actual"] != history[i]:
                raise ValueError("Frozen SARIMA actual mismatch")
            sarima = row["sarima"]
            if sarima["usable"] and (not math.isfinite(sarima["prediction"]) or sarima["prediction"] < 0):
                raise ValueError("Invalid frozen SARIMA mean")

    spec = importlib.util.spec_from_file_location("frozen_cmp_distribution", original / "run.py")
    cmp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cmp)
    return snapshot, sources, paths, cmp


def probability(cmp, mean, nu, count, actual):
    if actual is not None:
        return cmp.score(mean, nu, actual, count)
    _, pmf, _, _, _, _ = cmp.dist(mean, nu)
    cdf = np.cumsum(pmf)
    return {"p_exact": float(pmf[count]), "p_near": float(sum(pmf[max(0, count-1):count+2])),
            **{key: int(np.searchsorted(cdf, p)) for key, p in
               (("lo80", .1), ("hi80", .9), ("lo95", .025), ("hi95", .975))}}


def predictions(snapshot, source, cmp):
    fits = unique(csv_rows(source["fits.csv"]), lambda r: (r["disease"], int(r["n"])))
    historical = lambda r: (r["disease"], r["barangay"], int(r["n"]))
    available = unique((r for r in csv_rows(source["availability.csv"]) if r["protocol"] == "31_14"), historical)
    saved = unique((r for r in csv_rows(source["matched-targets.csv"])
                    if r["method"] == "Conditional-pooled-CMP" and r["protocol"] == "31_14"), historical)
    october = unique(csv_rows(source["october.csv"]), lambda r: (r["disease"], r["barangay"]))
    rows = []
    for disease in snapshot["diseases"]:
        scopes = [s for s in snapshot["scopes"] if s["disease"] == disease]
        for origin in range(31, 46):
            pairs = prior_pairs(scopes, origin)
            slope = sarima_challenger.fit(scopes, pairs, origin)
            pooled = fits[disease, origin]
            # Verify the frozen center is tied to these exact earlier prediction/outcome pairs.
            pool_input = [dict(mu=p["mean"], y=p["actual"], j=p["origin"], barangay=p["barangay"]) for p in pairs]
            if digest(json.dumps(pool_input, sort_keys=True).encode()) != pooled["pairs_sha256"]:
                raise ValueError(f"Frozen pooled fit history mismatch: {disease} {origin}")
            disease_nu = float(pooled["nu"]) if pooled["status"] == "ok" else None
            for scope in scopes:
                barangay = scope["barangay"]
                output = scope["outputs"][origin]
                history = scope["history"]
                actual = history[origin] if origin < 45 else None
                mean = output["sarima"]["prediction"] if output["sarima"]["usable"] else None
                count = math.floor(mean + .5) if mean is not None else None
                previous = history[origin-1]
                change = sarima_challenger.neighbor_change(scopes, barangay, origin)
                key = disease, barangay, origin
                pooled_available = (available[key]["challenger_available"] == "True" if origin < 45
                                    else october[disease, barangay]["status"] == "ok")
                if origin < 45 and (int(available[key]["actual"]) != actual or available[key]["target"] != output["target"]):
                    raise ValueError("Frozen CMP actual or target mismatch")

                row = dict(disease=disease, barangay=barangay, origin=origin, target=output["target"],
                           actual=actual, training_digest=output["training_digest"], previous=previous,
                           peer_change=change, ridge_slope=slope, ridge_pairs=len(pairs), sarima=mean,
                           ridge=sarima_challenger.predict(mean, slope, change), rounded_sarima=count,
                           sarima_status="ok" if mean is not None else output["sarima"]["reason"],
                           ridge_status=("SARIMA_unavailable" if mean is None else
                                         "insufficient_prior_pairs" if slope is None else "ok"),
                           pooled_status=("ok" if pooled_available else
                                          available[key]["reason"] if origin < 45 else october[disease, barangay]["status"]),
                           pooled_nu=disease_nu)
                if pooled_available:
                    baseline = probability(cmp, mean, disease_nu, count, actual)
                    reference = saved[key] if origin < 45 else october[disease, barangay]
                    checks = ({k: k for k in (*SCORE_KEYS, "mu", "nu")} if origin < 45 else
                              {"p_exact": "exact", "p_near": "nearby"})
                    if any(not math.isclose(baseline[k], float(reference[v]), abs_tol=1e-10, rel_tol=1e-9)
                           for k, v in checks.items()):
                        raise ValueError(f"Frozen baseline reproduction mismatch: {key}")
                    row.update({f"pooled_{k}": v for k, v in baseline.items()})
                local_pairs = [p for p in pairs if p["barangay"] == barangay]
                fitted = cmp_challenger.fit(local_pairs, disease_nu, origin, cmp.dist)
                row.update({f"local_{k}": v for k, v in fitted.items()})
                if mean is None:
                    row["local_status"] = "SARIMA_unavailable"
                elif fitted["status"] == "ok":
                    try:
                        local = probability(cmp, mean, fitted["nu"], count, actual)
                    except (ValueError, ArithmeticError, AssertionError, IndexError) as exc:
                        row.update(local_status="distribution_failed", local_reason=str(exc))
                    else:
                        row.update({f"local_{k}": v for k, v in local.items()})
                rows.append(row)
        print(f"{disease}: 7 scopes scored", flush=True)
    return rows


def average(values):
    values = list(values)
    return sum(values) / len(values) if values else None


def calibration(rows, model, event, p):
    bins = [[] for _ in range(10)]
    for row in rows:
        bins[min(9, int(row[f"{model}_{p}"] * 10))].append(row)
    return [{"bin_lower": i/10, "bin_upper": (i+1)/10, "n": len(group),
             "assigned": average(r[f"{model}_{p}"] for r in group),
             "observed": average(r[f"{model}_{event}"] for r in group)}
            for i, group in enumerate(bins)]


def summarize(rows):
    counts = [r for r in rows if r["ridge"] is not None and r["sarima"] is not None]
    prob = [r for r in rows if all(r[f"{m}_status"] == "ok" for m in PROB_MODELS)]
    result = {"attempts": len(rows), "count_matched": len(counts), "probability_matched": len(prob)}
    for model in COUNT_MODELS:
        errors = [r[model]-r["actual"] for r in counts]
        mse = average(e*e for e in errors)
        result[model] = dict(available=sum(r[model] is not None for r in rows),
                             mae=average(abs(e) for e in errors), rmse=math.sqrt(mse) if errors else None,
                             signed=average(errors), underpredicted=sum(e < 0 for e in errors))
    for model in PROB_MODELS:
        result[model] = dict(available=sum(r[f"{model}_status"] == "ok" for r in rows),
                             **{k: average(r[f"{model}_{k}"] for r in prob) for k in SCORE_KEYS})
    for level in (80, 95):
        result[f"width{level}_changes"] = dict(Counter(
            "wider" if r[f"local_width{level}"] > r[f"pooled_width{level}"] else
            "narrower" if r[f"local_width{level}"] < r[f"pooled_width{level}"] else "same" for r in prob))
    return result


def correlation(xs, ys):
    return float(np.corrcoef(xs, ys)[0, 1]) if np.std(xs) > 0 and np.std(ys) > 0 else None


def diagnostics(snapshot):
    out = []
    for disease in snapshot["diseases"]:
        scopes = [s for s in snapshot["scopes"] if s["disease"] == disease]
        pairs = prior_pairs(scopes, 36)
        x = [sarima_challenger.neighbor_change(scopes, p["barangay"], p["origin"]) for p in pairs]
        y = [p["actual"]-p["mean"] for p in pairs]
        lags = {f"mean_scope_lag{lag}": average(c for s in scopes
                if (c := correlation(s["history"][lag:36], s["history"][:36-lag])) is not None)
                for lag in (1, 12)}
        out.append(dict(disease=disease, origin=36, prior_pairs=len(pairs),
                        peer_change_vs_sarima_residual=correlation(x, y), **lags))
    return out


def write_csv(path, rows):
    fields = list(dict.fromkeys(key for row in rows for key in row))
    with path.open("x", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fields)
        writer.writeheader()
        writer.writerows(rows)


def safe_json(value):
    if isinstance(value, dict):
        return {k: safe_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [safe_json(v) for v in value]
    return "Infinity" if isinstance(value, float) and value == math.inf else value


def write_json(path, data):
    with path.open("x", encoding="utf-8") as handle:
        json.dump(safe_json(data), handle, indent=2, allow_nan=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ("project", "original", "pooled", "output"):
        parser.add_argument(f"--{key}", type=Path, required=True)
    a = parser.parse_args()
    out = a.output.resolve()
    if out.is_relative_to(a.project.resolve()):
        raise ValueError("Write results outside the application checkout")
    snapshot, source, hashes, cmp = load_inputs(a.project, a.original, a.pooled)
    here = Path(__file__).resolve().parent
    for name in ("POLICY.md", "run.py", "sarima_challenger.py", "cmp_challenger.py"):
        path = here / name
        hashes[path] = digest(path.read_bytes())
    out.mkdir(exist_ok=False)
    write_json(out / "freeze.json", {str(p): h for p, h in hashes.items()})
    print(cmp.selftest(), flush=True)
    write_csv(out / "training-diagnostics.csv", diagnostics(snapshot))
    rows = predictions(snapshot, source, cmp)
    if len(rows) != 1050:
        raise ValueError("Incomplete prediction roster")
    primary = [r for r in rows if 36 <= r["origin"] < 45]
    secondary = [r for r in rows if r["origin"] < 45]
    october = [r for r in rows if r["origin"] == 45]
    groups = {"primary": primary, "secondary": secondary,
              "primary_sudden_plus2": [r for r in primary if r["actual"]-r["previous"] >= 2],
              "primary_sudden_plus3_double": [r for r in primary
                                             if r["actual"]-r["previous"] >= 3 and r["actual"] >= 2*r["previous"]],
              "primary_other": [r for r in primary if r["actual"]-r["previous"] < 2]}
    summary = {key: summarize(group) for key, group in groups.items()}
    summary["october_availability"] = {m: sum(r[m] is not None for r in october) for m in ("sarima", "ridge")}
    summary["october_availability"].update({m: sum(r[f"{m}_status"] == "ok" for r in october) for m in PROB_MODELS})
    summary["primary_by_disease"] = {d: summarize([r for r in primary if r["disease"] == d])
                                     for d in snapshot["diseases"]}
    for protocol, targets in (("primary", primary), ("secondary", secondary)):
        matched = [r for r in targets if all(r[f"{m}_status"] == "ok" for m in PROB_MODELS)]
        for model in PROB_MODELS:
            for event, p in (("exact", "p_exact"), ("near", "p_near")):
                summary[f"{protocol}_{model}_{event}_calibration"] = calibration(matched, model, event, p)
    scopes = [dict(disease=s["disease"], barangay=s["barangay"], **summarize(
                   [r for r in primary if (r["disease"], r["barangay"]) == (s["disease"], s["barangay"])]))
              for s in snapshot["scopes"]]
    write_csv(out / "historical-targets.csv", secondary)
    write_csv(out / "october-unscored.csv", october)
    write_json(out / "all-70-scopes.json", scopes)
    for path, expected in hashes.items():
        verify(path, expected)
    write_json(out / "summary.json", summary)
    print("Completed 980 historical targets and 70 unscored October estimates", flush=True)


if __name__ == "__main__":
    main()

