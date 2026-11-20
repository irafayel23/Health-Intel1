import math
import unittest
from functools import partial

import cmp_challenger as cmp
import sarima_challenger as sarima
from run import prior_pairs, summarize


class SarimaCorrectionTests(unittest.TestCase):
    def setUp(self):
        self.scopes = [
            dict(barangay=str(b), history=list(range(45)), outputs={
                j: dict(sarima=dict(usable=True, prediction=j-2)) for j in range(31, 46)
            }) for b in range(7)
        ]

    def test_closed_form_and_missing(self):
        pairs = prior_pairs(self.scopes, 36)
        self.assertEqual(len(pairs), 35)
        slope = sarima.fit(self.scopes, pairs, 36)
        self.assertAlmostEqual(slope, 70/42)
        self.assertAlmostEqual(sarima.predict(3, slope, 1), 3 + 70/42)
        self.assertIsNone(sarima.predict(None, slope, 1))
        self.assertEqual(sarima.predict(.1, slope, -1), 0)
        self.assertIsNone(sarima.fit(self.scopes, prior_pairs(self.scopes, 35), 35))

    def test_current_and_later_rows_cannot_change_result(self):
        original = prior_pairs(self.scopes, 36)
        slope = sarima.fit(self.scopes, original, 36)
        for scope in self.scopes:
            scope["history"][36:] = [999]*9
            scope["outputs"][36]["sarima"]["prediction"] = 999
        self.assertEqual(original, prior_pairs(self.scopes, 36))
        self.assertEqual(slope, sarima.fit(self.scopes, prior_pairs(self.scopes, 36), 36))
        self.assertEqual(sarima.neighbor_change(self.scopes, "0", 36), 1)
        self.scopes[0]["history"][35] = 999
        self.assertEqual(sarima.neighbor_change(self.scopes, "0", 36), 1)
        with self.assertRaisesRegex(ValueError, "Non-prior"):
            sarima.fit(self.scopes, original+[dict(origin=36)], 36)


class CmpDispersionTests(unittest.TestCase):
    def test_penalty_exact_optimum(self):
        # Inject a quadratic negative log likelihood to verify the penalty algebra.
        def stub(mu, nu):
            return None, None, [-(math.log(nu)-1)**2 / 2]*2
        fit = cmp.fit([dict(origin=j, mean=1, actual=1) for j in range(31, 35)], 1, 36, stub)
        self.assertEqual(fit["status"], "ok")
        self.assertAlmostEqual(math.log(fit["nu"]), .5, places=6)
        self.assertAlmostEqual(fit["curvature"], 2, places=6)

    def test_missing_short_and_zero_mean(self):
        fn = partial(cmp.fit, origin=36, distribution=lambda *a: self.fail("Unexpected fit"))
        self.assertEqual(fn([], None)["status"], "disease_dispersion_unavailable")
        self.assertEqual(fn([], 1)["status"], "insufficient_local_pairs")
        pair = dict(origin=35, mean=0, actual=1)
        self.assertEqual(fn([pair], 1)["status"], "zero_mean_positive_training_outcome")
        with self.assertRaisesRegex(ValueError, "Non-prior"):
            fn([dict(pair, origin=36)], 1)

    def test_invalid_curvature_or_distribution_does_not_succeed(self):
        def invalid(*_):
            raise ValueError("Fixture failure")
        fit = cmp.fit([dict(origin=j, mean=1, actual=1) for j in range(31, 35)], 1, 36, invalid)
        self.assertEqual(fit["status"], "numerical_failure")

    def test_matching_and_unavailable_results(self):
        rows = [dict(sarima=2, ridge=3, previous=1, actual=4,
                     pooled_status="ok", local_status="distribution_failed")]
        summary = summarize(rows)
        self.assertEqual(summary["count_matched"], 1)
        self.assertEqual(summary["probability_matched"], 0)
        self.assertEqual(summary["pooled"]["available"], 1)
        self.assertEqual(summary["local"]["available"], 0)
        self.assertEqual(summary["ridge"]["signed"], -1)
        self.assertIsNone(summary["local"]["nll"])


if __name__ == "__main__":
    unittest.main(verbosity=2)

