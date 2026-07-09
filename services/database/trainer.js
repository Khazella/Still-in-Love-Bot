const pool = require('./postgres');

async function getTrainer(trainerName) {

    const result =
        await pool.query(
            `
            SELECT
                data->>'scraped_at_utc' AS scraped_at_utc,
                member
            FROM uma_circle_latest,
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