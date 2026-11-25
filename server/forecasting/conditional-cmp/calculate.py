"""Calculate only the frozen conditional-pooled distribution for verified run inputs."""
import json
import math
import os
import sys
from importlib.metadata import version

for variable in ('OPENBLAS_NUM_THREADS', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ[variable] = '1'

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frozen_math as CMP
from frozen_math import conditional_fit, dist, np

# The frozen fit resolves CMP.dist through the original module reference.
CMP.CMP = CMP


def calculate(scopes):
    pairs = {}
    for scope in scopes:
        pairs.setdefault((scope['disease'], scope.get('horizon', 1)), []).extend(scope['prior_pairs'])

    fits = {}
    for key, earlier_pairs in pairs.items():
        try:
            fits[key] = conditional_fit(earlier_pairs)
        except (ValueError, IndexError, ArithmeticError, AssertionError):
            fits[key] = {'status': 'numerical_failure'}

    rows = []
    for scope in scopes:
        row = {key: scope[key] for key in ('disease', 'barangay', 'mean')}
        if 'horizon' in scope:
            row.update(horizon=scope['horizon'], target=scope['target'])
        fit = fits[(row['disease'], scope.get('horizon', 1))]
        mean = row['mean']
        if mean is None:
            row['reason'] = 'SARIMA_unavailable'
        elif fit['status'] != 'ok':
            row['reason'] = fit['status']
        else:
            try:
                nu = fit['nu']
                _, p, _, _, _, _ = dist(mean, nu)
                cdf = np.cumsum(p)
                count = math.floor(mean + .5)

                def interval(level):
                    tail = (1 - level / 100) / 2
                    return [int(np.searchsorted(cdf, tail)), int(np.searchsorted(cdf, 1 - tail))]

                row.update(
                    nu=nu, count=count, exact=float(p[count]) if count < len(p) else 0.,
                    nearby=float(sum(p[max(0, count - 1):count + 2])),
                    positive=1 - float(p[0]), range80=interval(80), range95=interval(95),
                    probabilities=p.tolist(),
                )
            except (ValueError, IndexError, ArithmeticError, AssertionError):
                row['reason'] = 'distribution_failed'
        rows.append(row)
    return rows


if __name__ == '__main__':
    if version('numpy') != '2.3.5' or version('scipy') != '1.18.1':
        raise RuntimeError('Operational probability environment version mismatch')
    json.dump(calculate(json.load(sys.stdin)), sys.stdout, allow_nan=False, separators=(',', ':'))
