const {
    getQuotaInfo
} = require('../calculations/quota');

const {
    getCurrentWeekInfo
} = require('../calculations/helpers');

const {
    calculateWeeklyStats
} = require('../calculations/weekly');

function generateWeeklyReport(
    row,
    settings
) {

    try {

        const member =
            row.member ?? row;

        if (!member) {
            throw new Error(
                'Trainer not found'
            );
        }

        const scrapedAtUtc =
            row.scraped_at_utc ??
            null;

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
            ] || 0;

        const thresholdText =
            `${(
                weeklyGoal /
                1_000_000
            ).toFixed(1)}M`;

        const stats =
            calculateWeeklyStats(
                member.daily_fans,
                weekInfo
            );

        const quotaPercent =
            weeklyGoal > 0
                ? (
                    stats.weeklyGain /
                    weeklyGoal *
                    100
                ).toFixed(2)
                : '0.00';

        return {

            title:
                `Trainer Report — ${member.trainer_name}`,

            description:
                `Week ${currentWeekIndex + 1}\n` +
                `Goal: ${thresholdText}`,

            color: 0xff3b3b,

            reportType:
                'weekly',

            footer:
                scrapedAtUtc
                    ? `Data source: uma.moe | Last data updated: ${scrapedAtUtc}`
                    : 'Data source: uma.moe',

            fields: [
                {
                    name:
                        'Weekly Fans',

                    value:
                        stats.weeklyGain.toLocaleString()
                },
                {
                    name:
                        'Daily Average',

                    value:
                        stats.dailyAverage.toLocaleString()
                },
                {
                    name:
                        'Goal Progress',

                    value:
                        `${quotaPercent}%`
                },
                {
                    name:
                        'Shame Score',

                    value:
                        String(
                            member.shame_score ?? 0
                        )
                }
            ],

            chart:
                stats.chart

        };

    } catch (error) {

        return {

            title: 'Error',

            description:
                error.message,

            color: 0xff0000,

            reportType:
                'weekly',

            fields: [],

            chart: []

        };

    }

}

module.exports = {
    generateWeeklyReport
};