const pool = require('./postgres');

async function testConnection() {
    const result = await pool.query(
        'SELECT COUNT(*) FROM umamusume_skills'
    );

    return result.rows[0].count;
}

async function autocompleteSkills(search) {
    const result = await pool.query(
        `
        SELECT DISTINCT
            internal_name_en
        FROM umamusume_skills
        WHERE
            internal_name_en IS NOT NULL
            AND internal_name_en <> ''
            AND (
                internal_name_en ILIKE $1
                OR name_en ILIKE $1
            )
        ORDER BY internal_name_en
        LIMIT 25
        `,
        [`%${search}%`]
    );

    return result.rows;
}

module.exports = {
    testConnection,
    autocompleteSkills
};