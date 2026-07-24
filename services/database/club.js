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

module.exports = {
    getLatestClubData
};