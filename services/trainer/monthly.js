const {
    getGoalInfo
} = require('../fans/goals');

// ===================================
// GET ACTIVE MONTH DATA
// ===================================

function getActiveMonthData(
    daily
) {

    if (
        !Array.isArray(daily) ||
        daily.length < 2
    ) {
        return [];
    }

    let lastActiveIndex = -1;

    for (
        let i = daily.length - 1;
        i >= 0;
        i--
    ) {

        if (
            (Number(daily[i]) || 0) > 0
        ) {

            lastActiveIndex = i;
            break;

        }

    }

    if (lastActiveIndex < 1) {
        return [];
    }

    return daily.slice(
        0,
        lastActiveIndex + 1
    );

}

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

        const goalInfo =
            getGoalInfo(settings);

        const monthlyGoal =
            goalInfo.monthlyGoal || 0;

        const thresholdLabel =
            `${(
                monthlyGoal /
                1_000_000
            ).toFixed(1)}M`;

        const daily =
            Array.isArray(
                member.daily_fans
            )
                ? member.daily_fans
                : [];

        // =========================
        // ACTIVE MONTH DATA
        // =========================

        const activeData =
            getActiveMonthData(
                daily
            );

        if (
            activeData.length < 2
        ) {

            throw new Error(
                'No monthly data available'
            );

        }

        const activeDays =
            Math.max(
                1,
                activeData.length - 1
            );

        // =========================
        // TOTAL MONTHLY GAIN
        // =========================

        let totalGain = 0;

        for (
            let i = 1;
            i < activeData.length;
            i++
        ) {

            const today =
                Number(
                    activeData[i]
                ) || 0;

            const yesterday =
                Number(
                    activeData[i - 1]
                ) || 0;

            if (
                today <= 0 ||
                yesterday <= 0
            ) {
                continue;
            }

            const gain =
                today - yesterday;

            if (gain <= 0) {
                continue;
            }

            totalGain += gain;

        }

        // =========================
        // CHART
        // =========================

        const chart = [];

        for (
            let i = 1;
            i < activeData.length;
            i++
        ) {

            const today =
                Number(
                    activeData[i]
                ) || 0;

            const yesterday =
                Number(
                    activeData[i - 1]
                ) || 0;

            if (
                today <= 0 ||
                yesterday <= 0
            ) {

                chart.push(0);
                continue;

            }

            const gain =
                today - yesterday;

            chart.push(
                gain > 0
                    ? gain
                    : 0
            );

        }

        // =========================
        // STATS
        // =========================

        const dailyAverage =
            totalGain > 0
                ? Math.round(
                    totalGain /
                    activeDays
                )
                : 0;

        const quotaPercent =
            monthlyGoal > 0
                ? (
                    totalGain /
                    monthlyGoal *
                    100
                ).toFixed(2)
                : '0.00';

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
                    ? `Data source: uma.moe | Last data updated: ${scrapedAtUtc}`
                    : 'Data source: uma.moe',

            fields: [
                {
                    name:
                        'Monthly Fans',

                    value:
                        totalGain.toLocaleString()
                },
                {
                    name:
                        'Daily Average',

                    value:
                        dailyAverage.toLocaleString()
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

            chart

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