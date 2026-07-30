const logger = require('../logger');

const {
    getQuotaInfo
} = require('../calculations/quota');

const {
    getCurrentWeekInfo,
    getLatestUpdate,
    isMemberKicked,
    normalizeName
} = require('../calculations/helpers');

const {
    calculateWeeklyStats
} = require('../calculations/weekly');

// =======================================================
// MAIN
// =======================================================

function generateWeeklyReport(
    row,
    settings,
    period = 'current'
) {

    try {

        const members =
            row.members ||
            row.data?.members;

        if (
            !Array.isArray(members) ||
            members.length === 0
        ) {
            throw new Error(
                'No members data found in input'
            );
        }

        const scrapedAtUtc =
            row.scraped_at_utc ||
            row.data?.scraped_at_utc ||
            row.scraped_at ||
            null;

        const circle =
            row.data?.circle ??
            row.circle ??
            {};

        const dataSource =
            row.source ||
            row.data?.source ||
            'uma.moe';

        const isUmaMoe =
            dataSource === 'uma.moe';

        // ===================================================
        // ACTIVE MEMBERS
        // ===================================================

        const latestUpdate =
            getLatestUpdate(
                members
            );

        const filteredMembers =
            members.filter(
                member =>
                    !isMemberKicked(
                        member,
                        latestUpdate
                    )
            );

        if (
            filteredMembers.length === 0
        ) {
            throw new Error(
                'No active members found'
            );
        }

        // ===================================================
        // SELECTED WEEK
        // ===================================================

        logger.calc('getCurrentWeekInfo()');

        const weekInfo =
            getCurrentWeekInfo(
                filteredMembers[0]?.daily_fans ?? [],
                period
            );

        const {
            currentWeekIndex
        } = weekInfo;

        const selectedWeek =
            currentWeekIndex + 1;

        // ===================================================
        // QUOTA
        // ===================================================

        const quotaInfo =
            getQuotaInfo(settings);

        const weeklyGoal =
            quotaInfo.weeklyGoals[
                selectedWeek
            ] || 0;

        const thresholdText =
            `${(
                weeklyGoal /
                1_000_000
            ).toFixed(1)}M`;

        // ===================================================
        // ROWS
        // ===================================================

        const calcStart = Date.now();

        const rows =
            filteredMembers
                .map(member => {

                    const stats =
                        calculateWeeklyStats(
                            member.daily_fans,
                            weekInfo
                        );

                    // =======================================
                    // SHAME
                    //
                    // Uma.moe has shame data.
                    // Chronogenesis does not.
                    // =======================================

                    let shame =
                        null;

                    if (isUmaMoe) {

                        shame =
                            member.shame_score ?? 0;

                    }

                    return {

                        viewerId:
                            member.viewer_id,

                        name:
                            normalizeName(
                                member.trainer_name ||
                                member.name ||
                                `ID_${member.viewer_id}`
                            ),

                        fans:
                            stats.weeklyGain,

                        daily:
                            stats.dailyAverage,

                        shame

                    };

                })
                .sort(
                    (a, b) =>
                        b.fans - a.fans
                )
                .map(
                    (r, index) => ({

                        rank:
                            index + 1,

                        name:
                            r.name,

                        fans:
                            r.fans.toLocaleString(),

                        daily:
                            r.daily.toLocaleString(),

                        shame:
                            r.shame

                    })
                );

        logger.calc(`Weekly statistics completed (${filteredMembers.length} members, ${Date.now() - calcStart}ms)`);

        // ===================================================
        // OUTPUT
        // ===================================================

        // ===================================================
        // CURRENT GOAL (for progress bar color)
        //
        // The expected fan gain for the current point in the
        // selected week. This is used by the renderer to
        // determine whether a member is ahead/behind quota.
        //
        //   currentGoal = dailyQuota × dayOfCurrentWeek
        //
        // For Weeks 1-3, dayOfCurrentWeek is always 7 (end of
        // completed week), so currentGoal equals the weekly goal.
        // For Week 4 (current), dayOfCurrentWeek varies based on
        // how far into the week we are (e.g. day 30 of month
        // is day 9 of Week 4, so currentGoal = dailyQuota × 9).
        // ===================================================

        const currentGoal =
            quotaInfo.dailyGoals[
                selectedWeek
            ] * weekInfo.dayOfCurrentWeek;

        return {

            title:
                `${settings.display_name} : Weekly Fan Report — Week ${selectedWeek}`,

            description:
                `Goal: ${thresholdText}\n` +
                `Monthly Rank: ${circle.monthly_rank ?? '-'}\n` +
                `Last Month Rank: ${circle.last_month_rank ?? '-'}\n` +
                `Members: ${filteredMembers.length}/30`,

            monthlyRank:
                circle.monthly_rank != null
                    ? Number(circle.monthly_rank)
                    : null,

            color:
                0xff3b3b,

            reportType:
                'weekly',

            source:
                dataSource,

            // Renderer can use this directly.
            // true  = show Shame column
            // false = remove Shame column
            showShame:
                isUmaMoe,

            footer:
                scrapedAtUtc
                    ? `Data source: ${dataSource} | Last data updated: ${scrapedAtUtc}`
                    : `Data source: ${dataSource}`,

            rows,

            currentGoal

        };

    } catch (error) {

        logger.error(
            'club-report.generateWeeklyReport()',
            error
        );

        return {

            title:
                'Error',

            description:
                error.message,

            color:
                0xff0000,

            reportType:
                'weekly',

            showShame:
                false,

            rows: []

        };

    }

}

module.exports = {
    generateWeeklyReport
};