/**
 * Benchmark calculation for the /benchmark command.
 *
 * The bot owns the benchmark calculation now: it reads the daily
 * `benchmark_snapshot` rows from PostgreSQL and builds the same result
 * the n8n "Benchmark Calculator" used to produce:
 *
 *   {
 *       snapshot_date,
 *       snapshot_time,
 *       current,   // { top10, top30, top100, first }
 *       chart      // [ { day, top10, top30, top100, first }, ... ]
 *   }
 *
 * Definitions (unchanged from the n8n workflow):
 *   - "Entry"  = the boundary club's cumulative fans, converted to
 *                Fans / Member / Day via dailyPerMember().
 *   - "Average"= the mean cumulative fans of the row's band, converted
 *                the same way. Bands are [1-10], [11-30], [31-100].
 *   - chart day 1 = fans / 30, later days = (fans - previous) / 30.
 *
 * Club "First" is carried through as an extra row/series using the
 * exact same definitions, so it stays comparable with the benchmark
 * tiers.
 */

// Standard club size used by the benchmark.
const MEMBERS_PER_BENCHMARK = 30;

// Club whose daily growth is overlaid on the benchmark chart.
const CLUB_FIRST_NAME = 'First';

// =======================================================
// HELPERS (mirror the n8n Benchmark Calculator)
// =======================================================

/**
 * Safe rank lookup. A temporarily missing rank resolves to a zero-fans
 * club so the benchmark never crashes.
 *
 * @param {Array<object>} list
 * @param {number} rank
 * @returns {object}
 */
function entry(list, rank) {

    return (list || []).find(
        club => club.rank === rank
    ) ?? {
        rank,
        fans: 0,
        memberCount: MEMBERS_PER_BENCHMARK
    };

}

/**
 * Mean of a club list's total fans.
 *
 * @param {Array<object>} list
 * @returns {number}
 */
function average(list) {

    if (!list || !list.length) {
        return 0;
    }

    return (
        list.reduce(
            (sum, club) => sum + club.fans,
            0
        ) / list.length
    );

}

/**
 * Convert cumulative fans into the "Fans / Member / Day" figure.
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
 * Render a 'YYYY-MM-DD' snapshot date the way the benchmark workflow
 * saw it.
 *
 * The snapshot DATE is interpreted in Asia/Jakarta (UTC+7). The
 * workflow received it as a JS date and read the day off its ISO
 * serialisation, which lands on the previous UTC day
 * (e.g. 2026-09-29 -> "2026-09-28T17:00:00.000Z"). Reproducing that
 * keeps the current values identical.
 *
 * @param {string} snapshotDate - 'YYYY-MM-DD'
 * @returns {string} ISO string
 */
function snapshotIsoDate(snapshotDate) {

    const [
        year,
        month,
        day
    ] = String(snapshotDate)
        .split('-')
        .map(Number);

    return new Date(
        Date.UTC(year, month - 1, day) -
        7 * 60 * 60 * 1000
    ).toISOString();

}

/**
 * Benchmark day used by the "Current" table.
 *
 * @param {string} snapshotDate - 'YYYY-MM-DD'
 * @returns {number}
 */
function currentDay(snapshotDate) {

    const iso =
        snapshotIsoDate(snapshotDate);

    const day =
        Number(iso.substring(8, 10));

    const year =
        Number(iso.substring(0, 4));

    const month =
        Number(iso.substring(5, 7));

    if (day === 1) {

        return new Date(
            Date.UTC(year, month - 1, 0)
        ).getUTCDate();

    }

    return day;

}

/**
 * Chart day label.
 *
 * @param {string} snapshotDate - 'YYYY-MM-DD'
 * @returns {number}
 */
function chartDay(snapshotDate) {

    const iso =
        snapshotIsoDate(snapshotDate);

    const day =
        Number(iso.substring(8, 10));

    const year =
        Number(iso.substring(0, 4));

    const month =
        Number(iso.substring(5, 7));

    if (day === 1) {

        return new Date(
            Date.UTC(year, month - 1, 0)
        ).getUTCDate();

    }

    return day - 1;

}

// =======================================================
// MAIN
// =======================================================

/**
 * Build the benchmark result from raw snapshot rows.
 *
 * @param {Array<object>} rows - rows from getBenchmarkMonthRows()
 * @param {string} [clubName] - club to add as the extra series
 * @returns {object|null} benchmark result, or null when there is no data
 */
function calculateBenchmark(
    rows,
    clubName = CLUB_FIRST_NAME
) {

    const clubs =
        (rows || []).map(row => ({

            snapshotDate:
                String(row.snapshot_date),

            snapshotTime:
                row.snapshot_time,

            rank:
                Number(row.rank),

            clubName:
                row.club_name,

            fans:
                Number(row.fans),

            memberCount:
                Number(
                    row.member_count ??
                    MEMBERS_PER_BENCHMARK
                )

        }));

    if (clubs.length === 0) {
        return null;
    }

    // Group by snapshot date.
    const byDate = {};

    for (const club of clubs) {

        if (!byDate[club.snapshotDate]) {
            byDate[club.snapshotDate] = [];
        }

        byDate[club.snapshotDate].push(club);

    }

    const snapshotDates =
        Object.keys(byDate).sort();

    if (snapshotDates.length === 0) {
        return null;
    }

    const latestDate =
        snapshotDates[snapshotDates.length - 1];

    const latestSnapshot =
        byDate[latestDate];

    // Club fans keyed by date, for the extra series.
    const clubFansByDate = {};

    for (const club of clubs) {

        if (club.clubName === clubName) {
            clubFansByDate[club.snapshotDate] =
                club.fans;
        }

    }

    const hasClub =
        Object.keys(clubFansByDate).length > 0;

    // ===================================================
    // CURRENT
    // ===================================================

    const benchmarkDay =
        currentDay(latestDate);

    const current = {

        top10: {
            entry: dailyPerMember(
                entry(latestSnapshot, 10).fans,
                benchmarkDay
            ),
            average: dailyPerMember(
                average(
                    latestSnapshot.filter(
                        c => c.rank >= 1 && c.rank <= 10
                    )
                ),
                benchmarkDay
            )
        },

        top30: {
            entry: dailyPerMember(
                entry(latestSnapshot, 30).fans,
                benchmarkDay
            ),
            average: dailyPerMember(
                average(
                    latestSnapshot.filter(
                        c => c.rank >= 11 && c.rank <= 30
                    )
                ),
                benchmarkDay
            )
        },

        top100: {
            entry: dailyPerMember(
                entry(latestSnapshot, 100).fans,
                benchmarkDay
            ),
            average: dailyPerMember(
                average(
                    latestSnapshot.filter(
                        c => c.rank >= 31 && c.rank <= 100
                    )
                ),
                benchmarkDay
            )
        }

    };

    // ===================================================
    // CHART
    // ===================================================

    const firstSnapshot =
        byDate[snapshotDates[0]];

    const chart = [];

    // Day 1 is measured from a zero baseline (monthly fan reset).
    chart.push({
        day: 1,
        top10: Math.round(
            entry(firstSnapshot, 10).fans /
            MEMBERS_PER_BENCHMARK
        ),
        top30: Math.round(
            entry(firstSnapshot, 30).fans /
            MEMBERS_PER_BENCHMARK
        ),
        top100: Math.round(
            entry(firstSnapshot, 100).fans /
            MEMBERS_PER_BENCHMARK
        ),
        first: hasClub
            ? clubFansByDate[snapshotDates[0]] != null
                ? Math.round(
                    clubFansByDate[snapshotDates[0]] /
                    MEMBERS_PER_BENCHMARK
                )
                : null
            : null
    });

    for (
        let i = 1;
        i < snapshotDates.length;
        i++
    ) {

        const currentSnapshot =
            byDate[snapshotDates[i]];

        const previousSnapshot =
            byDate[snapshotDates[i - 1]];

        const currentFans =
            clubFansByDate[snapshotDates[i]];

        const previousFans =
            clubFansByDate[snapshotDates[i - 1]];

        chart.push({

            day: i + 1,

            top10: Math.round(
                (
                    entry(currentSnapshot, 10).fans -
                    entry(previousSnapshot, 10).fans
                ) / MEMBERS_PER_BENCHMARK
            ),

            top30: Math.round(
                (
                    entry(currentSnapshot, 30).fans -
                    entry(previousSnapshot, 30).fans
                ) / MEMBERS_PER_BENCHMARK
            ),

            top100: Math.round(
                (
                    entry(currentSnapshot, 100).fans -
                    entry(previousSnapshot, 100).fans
                ) / MEMBERS_PER_BENCHMARK
            ),

            // Missing club snapshot on either day becomes a gap so
            // every value keeps its correct date.
            first:
                hasClub &&
                currentFans != null &&
                previousFans != null
                    ? Math.round(
                        (currentFans - previousFans) /
                        MEMBERS_PER_BENCHMARK
                    )
                    : null

        });

    }

    // ===================================================
    // FIRST (current row)
    // ===================================================

    if (hasClub) {

        let clubLatestFans = null;

        for (const date of snapshotDates) {

            if (clubFansByDate[date] != null) {
                clubLatestFans = clubFansByDate[date];
            }

        }

        if (clubLatestFans != null) {

            const value =
                dailyPerMember(
                    clubLatestFans,
                    benchmarkDay
                );

            // A single club is both the boundary and its own group,
            // so Entry and Average are the same figure.
            current.first = {
                entry: value,
                average: value
            };

        }

    }

    return {

        snapshot_date:
            latestDate,

        snapshot_time:
            latestSnapshot[0].snapshotTime,

        current,

        chart

    };

}

module.exports = {

    MEMBERS_PER_BENCHMARK,

    CLUB_FIRST_NAME,

    entry,

    average,

    dailyPerMember,

    snapshotIsoDate,

    currentDay,

    chartDay,

    calculateBenchmark

};
