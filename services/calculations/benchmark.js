/**
 * Daily-growth calculations for the benchmark chart.
 *
 * The Entry Rank benchmark lines produced by the benchmark workflow are
 * defined as:
 *
 *     day N = ( fans(snapshot N + 1) - fans(snapshot N) ) / 30
 *
 * where:
 *   - the divisor is the standard club size (30 members), which is the
 *     "Fans / Member / Day" unit shown on the chart, and
 *   - the first day of the month is measured from a 0 baseline because
 *     the fan counter resets at the start of every month.
 *
 * Club "First" must use the exact same definition so both series can be
 * compared on the same axis, so the helpers below are intentionally
 * written to mirror that calculation.
 */

// Standard club size used by the Entry Rank benchmark series.
const MEMBERS_PER_BENCHMARK = 30;

// Club whose daily growth is overlaid on the benchmark chart.
const CLUB_FIRST_NAME = 'First';

/**
 * Convert a Date to the Asia/Jakarta wall clock.
 *
 * Mirrors the timezone handling already used by the bot
 * (see services/calculations/quota.js) so the benchmark month is the
 * same "Uma day" month that the snapshot belongs to.
 *
 * @param {Date} date
 * @returns {Date}
 */
function toJakartaDate(date) {

    return new Date(
        date.toLocaleString(
            'en-US',
            {
                timeZone: 'Asia/Jakarta'
            }
        )
    );

}

/**
 * Build the inclusive 'YYYY-MM-DD' bounds of a month.
 *
 * @param {number} year
 * @param {number} month - 1-based month
 * @returns {{startDate: string, endDate: string}}
 */
function getMonthRange(year, month) {

    const lastDay =
        new Date(
            Date.UTC(year, month, 0)
        ).getUTCDate();

    const pad =
        value => String(value).padStart(2, '0');

    return {
        startDate:
            `${year}-${pad(month)}-01`,
        endDate:
            `${year}-${pad(month)}-${pad(lastDay)}`
    };

}

/**
 * Build per-day daily growth for a club from its stored snapshots.
 *
 * Same definition as the Entry Rank benchmark:
 *   growth(day N) = ( fans(N + 1) - fans(N) ) / divisor
 *
 * Days whose snapshot (or the following day's snapshot) is missing are
 * left unset, letting the chart render a gap instead of shifting the
 * rest of the series.
 *
 * @param {Array<{snapshot_date: Date, fans: string|number}>} snapshots
 * @param {number} [divisor]
 * @returns {Record<number, number>} day-of-month -> growth
 */
function buildClubDailyGrowth(
    snapshots,
    divisor = MEMBERS_PER_BENCHMARK
) {

    const fansByDay = {};

    for (const snapshot of snapshots || []) {

        const day =
            new Date(
                snapshot.snapshot_date
            ).getUTCDate();

        fansByDay[day] =
            Number(snapshot.fans) || 0;

    }

    const growth = {};

    const days =
        Object.keys(fansByDay)
            .map(Number);

    if (days.length === 0) {
        return growth;
    }

    const lastDay =
        Math.max(...days);

    for (
        let day = 1;
        day < lastDay;
        day++
    ) {

        const current =
            fansByDay[day + 1];

        if (current === undefined) {
            continue;
        }

        let previous;

        if (day === 1) {

            // The fan counter resets on the 1st, so the first day is
            // measured from zero (identical to the Entry Rank series).
            previous = 0;

        } else if (fansByDay[day] === undefined) {

            // Missing previous snapshot: skip this day so the chart
            // keeps every value on its correct date.
            continue;

        } else {

            previous = fansByDay[day];

        }

        growth[day] =
            Math.round(
                (current - previous) / divisor
            );

    }

    return growth;

}

/**
 * Return a copy of the benchmark chart rows with the club growth added
 * as the `first` key on the matching day. Rows without club data get
 * `null`, which the chart renderer renders as a gap.
 *
 * @param {Array<{day: number}>} chart
 * @param {Record<number, number>} growth
 * @returns {Array<object>}
 */
function mergeClubGrowthIntoChart(chart, growth) {

    return (chart || []).map(row => ({

        ...row,

        first:
            growth[row.day] ?? null

    }));

}

/**
 * Mirror of the benchmark workflow's dailyPerMember() helper:
 *
 *     Math.round(fans / 30 / day)
 *
 * Turns a club's cumulative fan count into the "Fans / Member / Day"
 * figure shown in the Current Benchmark table.
 *
 * @param {number|string} fans
 * @param {number} day
 * @returns {number}
 */
function dailyPerMember(fans, day) {

    return Math.round(
        Number(fans) /
        MEMBERS_PER_BENCHMARK /
        Math.max(Number(day) || 1, 1)
    );

}

/**
 * Build the Club "First" row for the Current Benchmark table using the
 * exact Entry/Average methodology of the Top 10 / Top 30 / Top 100 rows.
 *
 * In the benchmark, "Entry" is the boundary club's rate and "Average"
 * is the mean rate of the row's group of clubs. For a single club the
 * boundary and the group are both First, so the two figures are equal
 * (this is what the generic buildSnapshot() produces for a one-club
 * group).
 *
 * @param {number|string} clubFans - First's cumulative fans
 * @param {number} benchmarkDay - number of benchmark days so far
 * @returns {{entry: number, average: number}}
 */
function buildClubBenchmarkRow(clubFans, benchmarkDay) {

    const value =
        dailyPerMember(clubFans, benchmarkDay);

    return {
        entry: value,
        average: value
    };

}

/**
 * Return the most recent snapshot entry from a list of snapshots.
 *
 * @param {Array<{snapshot_date: Date}>} snapshots
 * @returns {object|null}
 */
function getLatestSnapshot(snapshots) {

    let latest = null;

    for (const snapshot of snapshots || []) {

        if (
            !latest ||
            new Date(snapshot.snapshot_date) >
            new Date(latest.snapshot_date)
        ) {
            latest = snapshot;
        }

    }

    return latest;

}

module.exports = {

    MEMBERS_PER_BENCHMARK,

    CLUB_FIRST_NAME,

    toJakartaDate,

    getMonthRange,

    buildClubDailyGrowth,

    mergeClubGrowthIntoChart,

    dailyPerMember,

    buildClubBenchmarkRow,

    getLatestSnapshot

};
