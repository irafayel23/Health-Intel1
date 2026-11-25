'use strict';
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { loadDataset, FIRST_LIVE_CASE_DATE } = require('./dataset-analytics');
const { DISEASES, BARANGAYS, month, next, currentMonth, fail } = require('./monthly-data');
const { createSystemAudit } = require('./system-audit');

const columns = ['Date', 'Barangay', 'Disease', 'Cases'];
const acceptedHeaders = [...columns, 'Source'];
const storage = path.join(__dirname, '../data/operational-predictions/admin-analytics');
const maxBytes = 256000;
const compare = (a, b) => a.Date.localeCompare(b.Date) || a.Barangay.localeCompare(b.Barangay) || a.Disease.localeCompare(b.Disease);
const keyFor = row => [row.Date, row.Barangay, row.Disease].join('|');
const digest = value => createHash('sha256').update(value).digest('hex');
const dateRange = (start, end) => {
    const periods = [];
    for (let period = start; period <= end; period = next(period)) periods.push(period);
    return periods;
};

function readUpload(text, latest = currentMonth()) {
    if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > maxBytes) {
        throw fail('Choose a CSV file up to 250 KB.');
    }
    let rows;
    try {
        rows = parse(text, {
            bom: true, skip_empty_lines: true, trim: true, max_record_size: 512,
            columns: header => {
                if (![4, 5].includes(header.length) || header.some((value, index) => value !== acceptedHeaders[index])) {
                    throw fail('Use these CSV headers: Date, Barangay, Disease, Cases, and optional Source.');
                }
                return header;
            }
        });
    } catch (error) {
        if (error.status) throw error;
        throw fail('Could not read the CSV. Check its columns and quoting.');
    }
    if (!rows.length) throw fail('The CSV has no case-count rows.');
    const seen = new Set();
    return rows.map((row, index) => {
        const key = keyFor(row);
        const prefix = 'Data row ' + (index + 1) + ': ';
        if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(row.Date) || row.Date < '2023-01' || row.Date >= latest) throw fail(prefix + 'Use a completed month from January 2023 onward (YYYY-MM).');
        if (!BARANGAYS.includes(row.Barangay)) throw fail(prefix + 'Unknown barangay.');
        if (!DISEASES.includes(row.Disease)) throw fail(prefix + 'Unknown disease category.');
        if (!/^\d+$/.test(row.Cases) || !Number.isSafeInteger(Number(row.Cases)) || Number(row.Cases) > 1000000) throw fail(prefix + 'Use a whole case count from 0 to 1,000,000.');
        if (seen.has(key)) throw fail(prefix + 'Duplicate month, barangay and disease.');
        seen.add(key);
        const source = row.Source === 'Synthetic demonstration' ? row.Source : 'Uploaded, unverified';
        return { Date: row.Date, Barangay: row.Barangay, Disease: row.Disease, Cases: Number(row.Cases), Source: source };
    }).sort(compare);
}

function coverage(rows, first, last) {
    const dates = rows.map(row => row.Date).sort();
    const start = first ?? dates[0];
    const end = last ?? dates.at(-1);
    const counts = new Map();
    for (const row of rows) counts.set(row.Date, (counts.get(row.Date) ?? 0) + 1);
    return {
        first: dates[0], last: dates.at(-1), through: end, rows: rows.length,
        cases: rows.reduce((sum, row) => sum + row.Cases, 0),
        sources: [...new Set(rows.map(row => row.Source))],
        gaps: dateRange(start, end).filter(period => !counts.has(period)),
        partial: dateRange(start, end).filter(period => counts.has(period) && counts.get(period) < BARANGAYS.length * DISEASES.length)
    };
}

function trainingRange({ first, last, gaps, partial }) {
    const missing = new Set([...gaps, ...partial]);
    let streak = [];
    let range = null;
    for (const period of dateRange(first, last)) {
        if (missing.has(period)) {
            streak = [];
            continue;
        }
        streak.push(period);
        const months = Math.min(streak.length, 120);
        if (months >= 45 && months >= (range?.months ?? 0)) {
            range = { start: streak[streak.length - months], cutoff: period, months };
        }
    }
    return range;
}

async function readSavedDataset(version, directory = storage) {
    if (typeof version !== 'string' || !/^[a-f0-9]{64}$/.test(version)) throw fail('Choose a saved CSV version.');
    const raw = await fs.readFile(path.join(directory, 'datasets', version + '.json'), 'utf8').catch(error => {
        if (error.code === 'ENOENT') throw fail('This saved version was not found.', 404);
        throw error;
    });
    const { rows, descriptor } = JSON.parse(raw);
    if (!Array.isArray(rows) || descriptor?.id !== version || digest(JSON.stringify(rows)) !== version) {
        throw fail('The saved CSV version could not be verified.', 409);
    }
    return { rows, descriptor };
}

function createAdminAnalytics(db, operational, { directory = storage, now = () => new Date() } = {}) {
    const versions = path.join(directory, 'datasets');
    const audit = createSystemAudit(db);
    const latest = () => currentMonth(now());
    async function historical() {
        const rows = loadDataset().map(row => ({ Date: row.Date, Barangay: row.Barangay, Disease: row.Disease, Cases: row.Cases, Source: 'Synthetic demonstration' }));
        const months = dateRange(FIRST_LIVE_CASE_DATE.slice(0, 7), latest()).slice(0, -1);
        let reportingUnavailable = false;
        for (const period of months) {
            try {
                for (const report of await operational.reports(period)) {
                    if (!report.confirmed || report.pending) continue;
                    for (const disease of DISEASES) rows.push({
                        Date: period, Barangay: report.barangay, Disease: disease, Cases: report.counts[disease], Source: 'Confirmed operational reports'
                    });
                }
            } catch (error) {
                if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
                reportingUnavailable = true;
                break;
            }
        }
        return { rows: rows.sort(compare), reportingUnavailable };
    }

    async function list(dir, pattern) {
        return (await fs.readdir(dir).catch(error => {
            if (error.code === 'ENOENT') return [];
            throw error;
        })).filter(name => pattern.test(name));
    }

    async function read(file) {
        try {
            return JSON.parse(await fs.readFile(file, 'utf8'));
        } catch (error) {
            if (error.code === 'ENOENT') throw fail('This saved version was not found.', 404);
            throw error;
        }
    }

    async function write(dir, name, data) {
        await fs.mkdir(dir, { recursive: true });
        const temporary = path.join(dir, '.' + randomUUID() + '.tmp');
        try {
            await fs.writeFile(temporary, JSON.stringify(data), { mode: 0o600, flag: 'wx' });
            const destination = path.join(dir, name);
            await fs.link(temporary, destination);
        } finally {
            await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
        }
    }

    const preview = text => {
        const rows = readUpload(text, latest());
        const summary = coverage(rows);
        return { id: digest(JSON.stringify(rows)), ...summary, trainingRange: trainingRange(summary), sample: rows.slice(0, 5) };
    };

    async function save(text, id, user) {
        const rows = readUpload(text, latest());
        if (id !== digest(JSON.stringify(rows))) throw fail('The CSV has changed. Preview it again.');
        const descriptor = { id, label: 'Upload ' + id.slice(0, 8), created_at: now().toISOString(), ...coverage(rows) };
        try {
            await write(versions, id + '.json', { descriptor, rows });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            return (await read(path.join(versions, id + '.json'))).descriptor;
        }
        await audit.record(user, 'Analytics Dataset Saved', {
            summary: 'Saved a version of monthly aggregate case counts.', target_type: 'Dataset', target_id: id, outcome: 'Succeeded'
        }).catch(() => console.error('Failed to audit Admin dataset upload.'));
        return descriptor;
    }

    async function datasets() {
        const { rows, reportingUnavailable } = await historical();
        const previous = dateRange('2023-01', latest()).at(-2);
        const summaries = await Promise.all((await list(versions, /^[0-9a-f]{64}\.json$/)).map(async file => {
            const { descriptor } = await read(path.join(versions, file));
            return { ...descriptor, trainingRange: trainingRange(descriptor) };
        }));
        const summary = coverage(rows, '2023-01', previous);
        const historicalCoverage = coverage(loadDataset());
        const confirmed = rows.filter(row => row.Source === 'Confirmed operational reports');
        const latestConfirmed = confirmed.at(-1)?.Date ?? null;
        const complete = coverage(confirmed);
        const latestComplete = latestConfirmed ? dateRange(complete.first, complete.last).findLast(period =>
            !complete.gaps.includes(period) && !complete.partial.includes(period)) ?? null : null;
        return {
            historicalCoverage,
            operationalConfirmation: { latest: latestConfirmed, complete: latestComplete, confirmedBarangays: new Set(confirmed.filter(row => row.Date === latestConfirmed).map(row => row.Barangay)).size },
            bundled: { id: 'historical', label: 'Historical case counts', ...summary, latestConfirmed, latestComplete, reportingUnavailable },
            versions: summaries.sort((a, b) => b.created_at.localeCompare(a.created_at)),
            diseases: DISEASES, barangays: BARANGAYS, current: latest()
        };
    }

    async function map({ period, disease = 'all', barangay = 'all' }) {
        month(period);
        if (period < '2023-01' || period > latest() || (disease !== 'all' && !DISEASES.includes(disease)) ||
            (barangay !== 'all' && !BARANGAYS.includes(barangay))) throw fail('Choose a supported month, disease and barangay.');
        const historicalPeriod = period < FIRST_LIVE_CASE_DATE.slice(0, 7);
        let rows;
        if (historicalPeriod) {
            const byPlace = loadDataset().filter(row => row.Date === period);
            rows = BARANGAYS.map(place => {
                const counts = byPlace.filter(row => row.Barangay === place && (disease === 'all' || row.Disease === disease));
                return { barangay: place, cases: counts.length ? counts.reduce((sum, row) => sum + row.Cases, 0) : null, status: counts.length ? 'Demonstration data' : 'Missing' };
            });
        } else {
            const reports = await operational.reports(period).catch(error => {
                if (error.code === 'ER_NO_SUCH_TABLE') return operational.recorded(period);
                throw error;
            });
            rows = reports.map(report => {
                const cases = disease === 'all' ? report.total : report.counts[disease];
                return {
                    barangay: report.barangay, cases: cases > 0 || report.confirmed ? cases : null,
                    status: report.confirmed ? 'Confirmed' : cases > 0 ? 'Recorded so far' : 'Unconfirmed'
                };
            });
        }
        return { period, source: historicalPeriod ? 'Synthetic demonstration' : 'Operational case records', rows: rows.filter(row => barangay === 'all' || row.barangay === barangay) };
    }

    return {
        datasets, preview, save, map,
        exportCsv: async () => stringify((await historical()).rows, { header: true, columns }),
        template: () => stringify([], { header: true, columns })
    };
}

module.exports = { createAdminAnalytics, readUpload, readSavedDataset, coverage };
