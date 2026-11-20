"""Disease-level ridge correction for the frozen one-step SARIMA mean."""
import math


def neighbor_change(scopes, barangay, origin):
    peers = [scope["history"] for scope in scopes if scope["barangay"] != barangay]
    if origin < 2 or not peers or any(len(history) < origin for history in peers):
        raise ValueError("Incomplete peer history")
    return math.fsum(history[origin - 1] - history[origin - 2] for history in peers) / len(peers)


def fit(scopes, pairs, origin):
    if any(pair["origin"] >= origin for pair in pairs):
        raise ValueError("Non-prior residual")
    if (len(pairs) < 28 or len({p["origin"] for p in pairs}) < 5
            or len({p["barangay"] for p in pairs}) < 5):
        return None
    changes = [neighbor_change(scopes, p["barangay"], p["origin"]) for p in pairs]
    covariance = math.fsum(x * (p["actual"] - p["mean"]) for x, p in zip(changes, pairs))
    return covariance / (7 + math.fsum(x*x for x in changes))


def predict(mean, slope, change):
    if mean is None or slope is None:
        return None
    return max(0.0, mean + slope * change)

