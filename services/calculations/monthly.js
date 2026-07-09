const {
    getActiveMonthData
} = require('./helpers');

function calculateMonthlyStats(
    daily
) {

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
    // DAILY AVERAGE
    // =========================

    const dailyAverage =
        totalGain > 0
            ? Math.round(
                totalGain /
                activeDays
            )
            : 0;

    return {

        totalGain,

        activeDays,

        dailyAverage,

        chart

    };

}

module.exports = {
    calculateMonthlyStats
};