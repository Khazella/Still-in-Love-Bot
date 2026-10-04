const pool = require('./postgres');

const TABLES = {
    uma: 'uma_circle_latest',
    chrono: 'chrono_circle_latest'
};

async function getLatestClubData(source = 'uma') {

    const table =
        TABLES[source] ||
        TABLES.uma;

    const result = await pool.query(`
        SELECT
            circle_id,
            scraped_at,
            data
        FROM ${table}
        LIMIT 1
    `);

    return result.rows[0];
}

/**
 * Find a member in the CURRENT Club First member data by permanent viewer_id.
 *
 * Uses the existing current-circle snapshot table (uma_circle_latest /
 * chrono_circle_latest) — the same data refreshed roughly every 15 minutes —
 * rather than introducing a second source of Club First membership. Members
 * who leave/quit/get kicked are removed from this data, so a null result
 * means "not currently in Club First".
 *
 * @param {string} viewerId - permanent in-game Trainer ID
 * @param {string} source   - 'uma' (default) or 'chrono'
 * @returns {Promise<object|null>} the member object, or null if not found
 */
async function findMemberByViewerId(viewerId, source = 'uma') {

    const table =
        TABLES[source] ||
        TABLES.uma;

    const result =
        await pool.query(
            `
            SELECT member
            FROM ${table},
                 jsonb_array_elements(data->'members') AS member
            WHERE member->>'viewer_id' = $1
            LIMIT 1
            `,
            [String(viewerId)]
        );

    return result.rows[0]?.member ?? null;

}

module.exports = {
    getLatestClubData,
    findMemberByViewerId
};