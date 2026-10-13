/**
 * Safe, offline verification of the Club Report scheduling logic.
 *
 * It does NOT connect to Discord, does NOT touch the database, and does NOT
 * change the production schedule. It verifies both schedule modes:
 *   - hourly   -> computeNextRun()      resolves to the next HH:<minute>
 *   - interval -> computeNextIntervalRun() resolves to the next N-minute boundary
 *
 * Run:
 *   node scripts/test-club-report-scheduler.js
 */

const {
    computeNextRun,
    computeNextIntervalRun,
    formatJakarta
} = require('../services/automation/schedule');

const MINUTE = 1;
const HOUR_MS = 60 * 60 * 1000;

// Independent reference: read the Asia/Jakarta wall-clock parts of an instant
// using the platform's IANA tz database (not the module's offset math), so the
// test does not merely assert the implementation against itself.
let jakartaFormatter = null;
try {
    jakartaFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
} catch (error) {
    jakartaFormatter = null;
}

function jakartaParts(date) {
    if (!jakartaFormatter) {
        return null;
    }
    const parts = {};
    for (const part of jakartaFormatter.formatToParts(date)) {
        parts[part.type] = part.value;
    }
    return parts;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

// =====================================================================
// HOURLY MODE (production: HH:<minute>)
// =====================================================================

const HOURLY_CASES = [
    '2026-10-05T06:59:55.000Z', // Jakarta 13:59:55 -> today 14:01
    '2026-10-05T07:00:00.000Z', // Jakarta 14:00:00 -> today 14:01
    '2026-10-05T07:00:59.999Z', // Jakarta 14:00:59.999 -> today 14:01
    '2026-10-05T07:01:00.000Z', // Jakarta 14:01:00 -> next 15:01
    '2026-10-05T07:01:00.001Z', // Jakarta 14:01:00.001 -> next 15:01
    '2026-10-05T00:00:00.000Z', // Jakarta 07:00:00 -> today 07:01
    '2026-10-05T23:59:59.000Z', // Jakarta 06:59:59 next day -> 07:01
    '2026-12-31T23:01:00.000Z'  // year rollover -> 2027-01-01T00:01:00Z
];

function testHourly() {
    let failures = 0;

    console.log('');
    console.log('Hourly scheduler test (Asia/Jakarta, HH:01)');
    console.log('---------------------------------------------------------');
    console.log('Input (UTC)                 | Next run (UTC)              | Next run (WIB)');
    console.log('---------------------------------------------------------');

    for (const iso of HOURLY_CASES) {
        const now = new Date(iso);
        const next = computeNextRun(now, MINUTE);
        const delta = next.getTime() - now.getTime();
        const parts = jakartaParts(next);

        let ok = true;
        const problems = [];

        try {
            assert(delta > 0, 'next run is not in the future');
            assert(delta <= HOUR_MS, `next run is ${delta}ms away (> 1 hour)`);
            assert(
                next.getUTCSeconds() === 0 && next.getUTCMilliseconds() === 0,
                'next run is not aligned to the start of a minute'
            );
        } catch (e) {
            ok = false;
            problems.push(e.message);
        }

        if (parts && (parts.minute !== '01' || parts.second !== '00')) {
            ok = false;
            problems.push(
                `Jakarta wall-clock is ${parts.hour}:${parts.minute}:${parts.second}, expected HH:01:00`
            );
        }

        if (!ok) {
            failures++;
        }

        console.log(
            `${iso}  | ${next.toISOString()}  | ${formatJakarta(next)}  ${ok ? 'PASS' : `FAIL (${problems.join('; ')})`}`
        );
    }

    // Determinism + self-correction.
    const sample = new Date('2026-10-05T07:15:30.000Z');
    assert(
        computeNextRun(sample, MINUTE).getTime() ===
            computeNextRun(sample, MINUTE).getTime(),
        'computeNextRun is not deterministic'
    );
    const run = computeNextRun(sample, MINUTE);
    const after = computeNextRun(run, MINUTE);
    assert(
        after.getTime() - run.getTime() === HOUR_MS,
        'hourly schedule does not self-correct to the following hour'
    );

    console.log('---------------------------------------------------------');
    return failures;
}

// =====================================================================
// INTERVAL MODE (temporary 15-minute test)
// =====================================================================

const INTERVAL_CASES = [
    '2026-10-05T07:11:00.000Z', // Jakarta 14:11 -> 14:15
    '2026-10-05T07:14:59.999Z', // Jakarta 14:14:59 -> 14:15
    '2026-10-05T07:15:00.000Z', // Jakarta 14:15 -> 14:30 (no re-fire)
    '2026-10-05T07:29:59.000Z', // Jakarta 14:29:59 -> 14:30
    '2026-10-05T07:45:00.000Z', // Jakarta 14:45 -> 15:00
    '2026-10-05T07:59:00.000Z'  // Jakarta 14:59 -> 15:00
];

const ALLOWED_MINUTES = new Set(['00', '15', '30', '45']);

function testInterval() {
    let failures = 0;
    const interval = 15;
    const intervalMs = interval * 60 * 1000;

    console.log('');
    console.log('Interval scheduler test (Asia/Jakarta, every 15 minutes)');
    console.log('---------------------------------------------------------');
    console.log('Input (UTC)                 | Next run (UTC)              | Next run (WIB)');
    console.log('---------------------------------------------------------');

    for (const iso of INTERVAL_CASES) {
        const now = new Date(iso);
        const next = computeNextIntervalRun(now, interval);
        const delta = next.getTime() - now.getTime();
        const parts = jakartaParts(next);

        let ok = true;
        const problems = [];

        try {
            assert(delta > 0, 'next run is not in the future');
            assert(delta <= intervalMs, `next run is ${delta}ms away (> ${interval} min)`);
            assert(
                next.getUTCSeconds() === 0 && next.getUTCMilliseconds() === 0,
                'next run is not aligned to the start of a minute'
            );
        } catch (e) {
            ok = false;
            problems.push(e.message);
        }

        if (parts && !ALLOWED_MINUTES.has(parts.minute)) {
            ok = false;
            problems.push(
                `Jakarta minute is :${parts.minute}, expected one of :00/:15/:30/:45`
            );
        }

        if (!ok) {
            failures++;
        }

        console.log(
            `${iso}  | ${next.toISOString()}  | ${formatJakarta(next)}  ${ok ? 'PASS' : `FAIL (${problems.join('; ')})`}`
        );
    }

    // Self-correction: from a boundary the next run advances by one interval.
    const run = computeNextIntervalRun(new Date('2026-10-05T07:11:00.000Z'), interval);
    const after = computeNextIntervalRun(run, interval);
    assert(
        after.getTime() - run.getTime() === intervalMs,
        'interval schedule does not self-correct to the following boundary'
    );

    console.log('---------------------------------------------------------');
    return failures;
}

function main() {
    const failures = testHourly() + testInterval();

    console.log(
        failures === 0
            ? '\nAll scheduling checks PASSED.'
            : `\n${failures} scheduling check(s) FAILED.`
    );

    process.exit(failures === 0 ? 0 : 1);
}

main();
