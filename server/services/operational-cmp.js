'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const D = require('./monthly-data');
const { validateRow } = require('./conditional-pooled-cmp');

const POLICY = 'conditional-pooled-CMP';
const POLICY_HASH = '0cbff37d20f6aaa6b2f494b227c1792dc3eef5b465e2e2ef425e32acf25a9e58';
const MATH_HASH = '89b77ff5ac90875462a39f8e73eba621d75ad377374faf513601e9da1cff9915';
const MODE = 'verified_operational_monthly_snapshot';
const WORKER = path.join(__dirname, '../forecasting/conditional-cmp');
const REASONS = new Set([
    'SARIMA_unavailable', 'insufficient_prior_prediction_pairs', 'zero_mean_positive_training_outcome',
    'optimizer_failed', 'boundary_optimum', 'optimality_failed', 'numerical_failure', 'distribution_failed',
]);

function unavailable(reason) {
    return { schema: 1, status: 'unavailable', experimental: true, policy: POLICY, reason };
}

// validateOutput has checked each date, actual, training prefix, and accepted SARIMA fit.
function earlierPairs({ output, result }) {
    return output.scopes.map(scope => ({
        disease: scope.disease,
        barangay: scope.barangay,
        mean: result.views[scope.disease + '\0' + scope.barangay].production['1'].prediction,
        prior_pairs: scope.outputs.filter(o => o.n < scope.history.length && o.sarima.usable)
            .map(o => ({ mu: o.sarima.prediction, y: o.actual, j: o.n, barangay: scope.barangay })),
    }));
}

function binding(run, verified) {
    const { input, output } = verified;
    return {
        mode: MODE, sarima_version: run, dataset_sha256: D.hash(input), sarima_output_sha256: D.hash(output),
        sarima_policy_sha256: input.policy_sha256, cmp_policy: POLICY, cmp_policy_sha256: POLICY_HASH,
        cmp_source_sha256: MATH_HASH, cutoff: input.cutoff, target: input.target,
    };
}

function validatePacket(packet, run, verified) {
    const expected = binding(run, verified);
    if (packet.schema !== 1 || D.hash(packet.binding) !== D.hash(expected) ||
        packet.review?.genuine_history_reviewed !== true || packet.review.outcomes_unknown !== true || !packet.review.reviewed_by ||
        !Number.isFinite(Date.parse(packet.review.reviewed_at)) ||
        D.currentMonth(new Date(packet.review.reviewed_at)) !== expected.target ||
        !Array.isArray(packet.rows) || packet.rows.length !== Object.keys(verified.result.views).length) {
        throw Error('Operational probability binding is invalid');
    }
    const seen = new Set();
    for (const row of packet.rows) {
        const key = row.disease + '\0' + row.barangay;
        const forecast = verified.result.views[key]?.production['1'];
        if (!forecast || seen.has(key) || row.mean !== forecast.prediction ||
            (forecast.actual_model !== 'SARIMA' && row.reason !== 'SARIMA_unavailable')) {
            throw Error('Operational probability scope or mean is invalid');
        }
        seen.add(key);
        if (row.reason) {
            if (!REASONS.has(row.reason) || Object.hasOwn(row, 'probabilities') ||
                (row.reason === 'SARIMA_unavailable') !== (forecast.prediction === null)) {
                throw Error('Invalid unavailable probability');
            }
        } else {
            validateRow(row);
        }
    }
    return packet;
}

async function calculate(python, scopes) {
    const source = fs.readFileSync(path.join(WORKER, 'frozen_math.py'), 'utf8').replace(/\r\n/g, '\n');
    if (crypto.createHash('sha256').update(source).digest('hex') !== MATH_HASH) {
        throw Error('Frozen COM-Poisson calculation failed integrity verification');
    }
    return new Promise((resolve, reject) => {
        const child = execFile(python, ['-I', '-X', 'utf8', '-B', path.join(WORKER, 'calculate.py')], {
            cwd: WORKER, windowsHide: true, timeout: 300000, maxBuffer: 16 * 1024 * 1024,
        }, (error, stdout) => {
            if (error) return reject(error);
            try { resolve(JSON.parse(stdout)); } catch (parseError) { reject(parseError); }
        });
        child.stdin.on('error', reject);
        child.stdin.end(JSON.stringify(scopes));
    });
}

function summary(packet) {
    return packet ? { status: 'prepared', available: packet.rows.filter(row => !row.reason).length, sha256: D.hash(packet) } : { status: 'unavailable' };
}

async function publishedDigest(db, run) {
    const [[event]] = await db.execute(
        `SELECT details FROM system_audit_logs
         WHERE action='Predictions Published'
           AND CASE WHEN JSON_VALID(details) THEN JSON_UNQUOTE(JSON_EXTRACT(details,'$.target_id')) END=?
         ORDER BY id LIMIT 1`, [run],
    );
    const digest = event && JSON.parse(event.details).probability_sha256;
    return /^[a-f0-9]{64}$/.test(digest || '') ? digest : null;
}

module.exports = { earlierPairs, binding, validatePacket, calculate, summary, unavailable, publishedDigest };
