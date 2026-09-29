const pool = require('./postgres');

/**
 * Database access for the benchmark season tables.
 *
 * `benchmark_snapshot` is the same daily snapshot source that backs the
 * Entry Rank lines of the Daily Benchmark Growth chart. Each row is one
 * club's snapshot for one day, so the club history needed for the
 * comparison series already exists here without any new table.
 */

/**
 * Fetch the stored daily snapshots for a single club inside a date range.
 *
 * @param {string} clubName - club name (e.g. "First")
 * @param {string} startDate - inclusive 'YYYY-MM-DD'
 * @param {string} endDate - inclusive 'YYYY-MM-DD'
 * @returns {Promise<Array<{snapshot_date: Date, member_count: number, fans: string}>>}
 */
async function getClubSnapshots(
    clubName,
    startDate,
    endDate
) {

    const result = await pool.query(
        `
        SELECT
            snapshot_date,
            member_count,
            fans
        FROM benchmark_snapshot
        WHERE club_name = $1
          AND snapshot_date BETWEEN $2 AND $3
        ORDER BY snapshot_date
        `,
        [
            clubName,
            startDate,
            endDate
        ]
    );

    return result.rows;

}

module.exports = {
    getClubSnapshots
};
