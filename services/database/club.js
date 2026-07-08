const pool = require('./postgres');

async function getLatestClubData() {
    const result = await pool.query(`
        SELECT
            circle_id,
            scraped_at,
            data
        FROM uma_circle_latest
        LIMIT 1
    `);

    return result.rows[0];
}

async function getLatestChronoData() {
    const result = await pool.query(`
        SELECT
            circle_id,
            scraped_at,
            data
        FROM chrono_circle_latest
        LIMIT 1
    `);

    return result.rows[0];
}

module.exports = {
    getLatestClubData,
    getLatestChronoData
};