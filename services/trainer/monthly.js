const {
    getQuotaInfo
} = require('../calculations/quota');

const {
    calculateMonthlyStats
} = require('../calculations/monthly');

// ===================================
// MAIN
// ===================================

function generateMonthlyReport(
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

        const dataSource =
            row.source ??
            'uma.moe';

        const isChrono =
            dataSource === 'chronogenesis.net';

        const quotaInfo =
            getQuotaInfo(settings);

        const monthlyGoal =
            quotaInfo.monthlyGoal || 0;

        const thresholdLabel =
            `${(
                monthlyGoal /
                1_000_000
            ).toFixed(1)}M`;

        const stats =
            calculateMonthlyStats(
                member.daily_fans
            );

        const quotaPercent =
            monthlyGoal > 0
                ? (
                    stats.totalGain /
                    monthlyGoal *
                    100
                ).toFixed(2)
                : '0.00';

        const fields = [
            {
                name:
                    'Monthly Fans',

                value:
                    stats.totalGain.toLocaleString()
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
            }
        ];

        if (!isChrono) {
            fields.push({
                name:
                    'Shame Score',

                value:
                    String(
                        member.shame_score ?? 0
                    )
            });
        }

        // =========================
        // OUTPUT
        // =========================

        return {

            title:
                `Trainer Report — ${member.trainer_name}`,

            description:
                `Monthly Report\n` +
                `Goal: ${thresholdLabel}`,

            color: 0xff3b3b,

            reportType:
                'monthly',

            footer:
                scrapedAtUtc
                    ? `Data source: ${dataSource} | Last data updated: ${scrapedAtUtc}`
                    : `Data source: ${dataSource}`,

            fields,

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
                'monthly',

            fields: [],

            chart: []

        };

    }

}

module.exports = {
    generateMonthlyReport
};