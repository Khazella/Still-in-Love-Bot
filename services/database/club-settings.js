const pool = require('./postgres');

async function getClubSettings(clubName) {

    const result =
        await pool.query(
            `
            SELECT *
            FROM club_settings
            WHERE club_name = $1
            `,
            [clubName]
        );

    return result.rows[0];
}

async function updateWeekGoal(
    clubName,
    week,
    dailyGoal
) {

    const column =
        `week${week}_daily`;

    const query = `
        UPDATE club_settings
        SET ${column} = $1,
            updated_at = NOW()
        WHERE club_name = $2
        RETURNING *
    `;

    const result =
        await pool.query(
            query,
            [
                dailyGoal,
                clubName
            ]
        );

    return result.rows[0];
}

module.exports = {
    getClubSettings,
    updateWeekGoal
};