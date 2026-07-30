const pool =
    require('./postgres');

// =======================================================
// GET MEMBER STATES FOR CLUB + SOURCE
// =======================================================

async function getClubMemberStates(
    circleId,
    source
) {

    const result =
        await pool.query(
            `
            SELECT
                circle_id,
                viewer_id,
                source,

                rank_month,
                monthly_rank,
                monthly_rank_change,

                weekly_week,
                weekly_rank,
                weekly_rank_change,

                shame_score,
                shame_change,

                updated_at

            FROM club_member_state

            WHERE circle_id = $1
              AND source = $2

            ORDER BY monthly_rank ASC
            `,
            [
                circleId,
                source
            ]
        );

    return result.rows;

}

// =======================================================
// EXPORTS
// =======================================================

module.exports = {
    getClubMemberStates
};