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
    settings
) {

    try {

        const weekInfo =
            getCurrentWeekInfo();

        const {
            currentWeekIndex
        } = weekInfo;

        const quotaInfo =
            getQuotaInfo(settings);

        const weeklyGoal =
            quotaInfo.weeklyGoals[
                currentWeekIndex + 1
            ];

        const thresholdText =
            `${(
                weeklyGoal /
                1_000_000
            ).toFixed(1)}M`;

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

        const rows =
            filteredMembers
                .map(member => {

                    const stats =
                        calculateWeeklyStats(
                            member.daily_fans,
                            weekInfo
                        );

                    return {

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

                        shame:
                            member.shame_score ?? 0

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

        return {

            title:
                `${settings.display_name} : Weekly Fan Report — Week ${currentWeekIndex + 1}`,

            description:
                `Goal: ${thresholdText}\n` +
                `Monthly Rank: ${circle.monthly_rank ?? '-'}\n` +
                `Last Month Rank: ${circle.last_month_rank ?? '-'}\n` +
                `Members: ${filteredMembers.length}/30`,

            color: 0xff3b3b,

            reportType:
                'weekly',

            source:
                dataSource,

            footer:
                scrapedAtUtc
                    ? `Data source: ${dataSource} | Last data updated: ${scrapedAtUtc}`
                    : `Data source: ${dataSource}`,

            rows

        };

    } catch (error) {

        return {

            title:
                'Error',

            description:
                error.message,

            color:
                0xff0000,

            reportType:
                'weekly',

            rows: []

        };

    }

}

module.exports = {
    generateWeeklyReport
};