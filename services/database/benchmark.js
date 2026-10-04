const pool = require('./postgres');

/**
 * Benchmark snapshot access.
 *
 * `benchmark_snapshot` stores one row per club per day for the current
 * benchmark season. It is the source of truth for /benchmark, so the
 * bot queries it directly and performs the benchmark calculation itself
 * (n8n is no longer involved in the /benchmark command).
 */

/**
 * Fetch every club snapshot for the current benchmark month in a single
 * query.
 *
 * The month boundary follows the existing snapshot semantics: a
 * snapshot dated the 1st belongs to the previous benchmark month, so
 * (for example) August 1 is still the final day of July's benchmark and
 * August 2 is day 1 of August. `snapshot_date` is returned as text so
 * callers always receive a plain 'YYYY-MM-DD' value regardless of the
 * Node process timezone.
 *
 * @returns {Promise<Array<{
 *   snapshot_date: string,
 *   snapshot_time: Date,
 *   rank: number,
 *   club_name: string,
 *   fans: string,
 *   member_count: number
 * }>>}
 */
async function getBenchmarkMonthRows() {

    const result = await pool.query(`
        WITH benchmark_dates AS (
            SELECT
                to_char(snapshot_date, 'YYYY-MM-DD') AS snapshot_date,
                snapshot_time,
                rank,
                club_name,
                fans,
                member_count,
                CASE
                    WHEN EXTRACT(DAY FROM snapshot_date) = 1
                    THEN snapshot_date - INTERVAL '1 day'
                    ELSE snapshot_date
                END AS effective_date
            FROM benchmark_snapshot
        )
        SELECT
            snapshot_date,
            snapshot_time,
            rank,
            club_name,
            fans,
            member_count
        FROM benchmark_dates
        WHERE DATE_TRUNC('month', effective_date) = DATE_TRUNC(
            'month',
            CASE
                WHEN CURRENT_DATE = DATE_TRUNC('month', CURRENT_DATE)::date
                THEN CURRENT_DATE - INTERVAL '1 day'
                ELSE CURRENT_DATE
            END
        )
        ORDER BY snapshot_date ASC, rank ASC;
    `);

    return result.rows;

}

module.exports = {
    getBenchmarkMonthRows
};
