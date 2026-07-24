const pool = require('./postgres');

const TABLES = {
    uma: 'uma_circle_latest',
    chrono: 'chrono_circle_latest'
};

async function getTrainer(trainerName, source = 'uma') {

    const table =
        TABLES[source] ||
        TABLES.uma;

    const result =
        await pool.query(
            `
            SELECT
                data->>'scraped_at_utc' AS scraped_at_utc,
                member
            FROM ${table},
                 jsonb_array_elements(data->'members') AS member
            WHERE member->>'trainer_name' ILIKE $1
            LIMIT 1
            `,
            [`%${trainerName}%`]
        );

    return result.rows[0] ?? null;

}

module.exports = {
    getTrainer
};