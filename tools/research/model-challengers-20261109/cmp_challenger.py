"""Fit local COM-Poisson dispersion around the frozen disease-level center."""
import math

from scipy.optimize import minimize_scalar


def fit(pairs, disease_nu, origin, distribution):
    if any(pair["origin"] >= origin for pair in pairs):
        raise ValueError("Non-prior residual")
    if disease_nu is None:
        return {"status": "disease_dispersion_unavailable"}
    if any(p["mean"] == 0 and p["actual"] > 0 for p in pairs):
        return {"status": "zero_mean_positive_training_outcome"}
    informative = [(p["mean"], p["actual"]) for p in pairs if p["mean"] > 0]
    n = len(informative)
    if n < 3:
        return {"status": "insufficient_local_pairs", "pairs": n}
    center = math.log(disease_nu)
    lo, hi = math.log(.05), math.log(100)

    def objective(log_nu):
        nu = math.exp(log_nu)
        loss = -math.fsum(float(distribution(mu, nu)[2][actual]) for mu, actual in informative)
        return loss + (log_nu - center)**2 / (2 * .5**2)

    try:
        opt = minimize_scalar(objective, method="bounded", bounds=(lo, hi), options={"xatol": 1e-7})
        x, h = float(opt.x), 1e-4
        v, a, b = objective(x), objective(x-h), objective(x+h)
        gradient = (b-a)/(2*h*n)
        curvature = (b-2*v+a)/(h*h*n)
    except (ValueError, ArithmeticError, AssertionError, IndexError) as exc:
        return {"status": "numerical_failure", "reason": str(exc), "pairs": n}
    checks_pass = (all(math.isfinite(z) for z in (v, gradient, curvature))
                   and abs(gradient) <= .001 and curvature >= -1e-5)
    status = "ok"
    if not opt.success:
        status = "optimizer_failed"
    elif min(x-lo, hi-x) < .0001:
        status = "boundary_optimum"
    elif not checks_pass:
        status = "optimality_failed"
    return {"status": status, "nu": math.exp(x) if status == "ok" else None,
            "gradient": gradient, "curvature": curvature, "pairs": n}

