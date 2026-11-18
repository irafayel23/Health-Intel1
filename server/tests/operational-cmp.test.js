'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../services/operational-cmp');

test('frozen calculator distinguishes zero, unavailable SARIMA, and sparse or impossible earlier evidence', async () => {
    const python = process.env.HEALTH_INTEL_QA_CMP_PYTHON;
    assert.ok(python, 'Set HEALTH_INTEL_QA_CMP_PYTHON to the pinned scientific Python');
    const make = (disease, means, outcomes) => means.map((mean, b) => ({
        disease, barangay: 'QA-' + b, mean,
        prior_pairs: outcomes.map((y, j) => ({ mu: 2, y, j: 31 + j, barangay: 'QA-' + b })),
    }));
    const ready = make('ready', [0, null, 2, 2, 2, 2, 2], [0, 1, 2, 3, 4]);
    const sparse = make('sparse', [2, 2, 2, 2, 2, 2, 2], [0, 1, 2, 3]);
    const noInformation = make('uninformative', [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0]);
    for (const scope of noInformation) for (const pair of scope.prior_pairs) pair.mu = 0;
    const impossible = make('impossible', [2, 2, 2, 2, 2, 2, 2], [0, 1, 2, 3, 4]);
    impossible[0].prior_pairs[1].mu = 0;
    const rows = await calculate(python, [...ready, ...sparse, ...noInformation, ...impossible]);
    assert.equal(rows[0].count, 0);
    assert.equal(rows[0].exact, 1);
    assert.deepEqual(rows[0].range95, [0, 0]);
    assert.equal(rows[1].reason, 'SARIMA_unavailable');
    assert.equal(rows[1].mean, null);
    assert.ok(rows[2].exact > 0 && rows[2].exact < 1);
    assert.ok(rows.slice(7, 21).every(row => row.reason === 'insufficient_prior_prediction_pairs'));
    assert.ok(rows.slice(21).every(row => row.reason === 'zero_mean_positive_training_outcome'));
    assert.ok(rows.filter(row => row.reason).every(row => row.probabilities === undefined));
});
