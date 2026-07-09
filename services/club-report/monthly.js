const {
    getQuotaInfo
} = require('../calculations/quota');

const {
    getLatestUpdate,
    isMemberKicked,
    normalizeName
} = require('../calculations/helpers');

const {
    calculateMonthlyStats
} = require('../calculations/monthly');

// ================================
// MAIN
// ================================

function generateMonthlyReport(
    row,
    settings
) {

    try {

        const quotaInfo =
            getQuotaInfo(settings);

        const THRESHOLD_LABEL =
            `${(
                quotaInfo.monthlyGoal /
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

        // ================================
        // KEEP ACTIVE MEMBERS ONLY
        // ================================

        const latestUpdate =
            getLatestUpdate(
                members.filter(
                    member =>
                        member?.last_updated
                )
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
            !filteredMembers.length
        ) {
            throw new Error(
                'No active members found'
            );
        }

        // ================================
        // AGGREGATION
        // ================================

        const monthlyResults = [];

        for (
            const member of filteredMembers
        ) {

            const daily =
                member.daily_fans;

            if (
                !Array.isArray(daily) ||
                daily.length < 2
            ) {
                continue;
            }

            let stats;

            try {

                stats =
                    calculateMonthlyStats(
                        daily
                    );

            } catch {

                continue;

            }

            monthlyResults.push({

                memberName:
                    normalizeName(
                        member.trainer_name ||
                        member.name ||
                        `ID_${member.viewer_id}`
                    ),

                fan_gain:
                    stats.totalGain,

                dayCount:
                    stats.activeDays,

                shame_score:
                    member.shame_score ?? 0

            });

        }

        if (
            monthlyResults.length === 0
        ) {
            throw new Error(
                'No valid processed data'
            );
        }

        // ================================
        // SORT + TOP 30
        // ================================

        const top =
            monthlyResults
                .sort(
                    (a, b) =>
                        b.fan_gain -
                        a.fan_gain
                )
                .slice(0, 30);

        // ================================
        // FORMAT ROWS
        // ================================

        const rows =
            top.map(
                (r, index) => {

                    const dailyAvg =
                        r.fan_gain > 0
                            ? Math.round(
                                r.fan_gain /
                                r.dayCount
                            )
                            : 0;

                    return {

                        rank:
                            index + 1,

                        name:
                            r.memberName,

                        fans:
                            r.fan_gain.toLocaleString(),

                        daily:
                            dailyAvg.toLocaleString(),

                        shame:
                            r.shame_score

                    };

                }
            );

        // ================================
        // OUTPUT
        // ================================

        return {

            title:
                `${settings.display_name} : Monthly Fan Report`,

            description:
                `Goal: ${THRESHOLD_LABEL}\n` +
                `Monthly Rank: ${circle.monthly_rank ?? '-'}\n` +
                `Last Month Rank: ${circle.last_month_rank ?? '-'}\n` +
                `Members: ${filteredMembers.length}/30`,

            color: 0xff3b3b,

            reportType:
                'monthly',

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

            title: 'Error',

            description:
                error.message,

            color: 0xff0000,

            reportType:
                'monthly',

            rows: []

        };

    }

}

module.exports = {
    generateMonthlyReport
};