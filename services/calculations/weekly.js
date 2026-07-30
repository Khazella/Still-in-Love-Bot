const DAYS_PER_WEEK = 7;
const MAX_WEEK_INDEX = 3;

function calculateWeeklyStats(
    dailyFans,
    weekInfo
) {

    const {
        effectiveDay,
        currentWeekIndex,
        dayOfCurrentWeek
    } = weekInfo;

    const totals =
        Array.isArray(dailyFans)
            ? dailyFans
            : [];

    const activeData =
        totals.slice(
            0,
            Math.min(
                effectiveDay + 1,
                totals.length
            )
        );

    const weeklyTotals = [];

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
            today === 0 &&
            yesterday === 0
        ) {
            continue;
        }

        if (
            today <= 0 ||
            yesterday <= 0
        ) {
            continue;
        }

        if (
            today < yesterday
        ) {
            continue;
        }

        const gain =
            today - yesterday;

        if (gain <= 0) {
            continue;
        }

        const weekIndex =
            Math.min(
                Math.floor(
                    (i - 1) /
                    DAYS_PER_WEEK
                ),
                MAX_WEEK_INDEX
            );

        weeklyTotals[
            weekIndex
        ] =
            (
                weeklyTotals[
                    weekIndex
                ] || 0
            ) + gain;

    }

    const weeklyGain =
        weeklyTotals[
            currentWeekIndex
        ] || 0;

    const dailyAverage =
        weeklyGain > 0
            ? Math.round(
                weeklyGain /
                Math.max(
                    1,
                    dayOfCurrentWeek
                )
            )
            : 0;

    // Cap weekStartDay so that for week index 3
    // (Week 4), it starts at day 22 (index 21)
    // regardless of effectiveDay being 29-31.
    const cappedWeekIndex =
        Math.min(
            currentWeekIndex,
            MAX_WEEK_INDEX
        );

    const weekStartDay =
        cappedWeekIndex *
        DAYS_PER_WEEK;

    const chartSource =
        totals.slice(
            weekStartDay,
            Math.min(
                weekStartDay +
                dayOfCurrentWeek +
                1,
                totals.length
            )
        );

    const chart = [];

    for (
        let i = 1;
        i < chartSource.length;
        i++
    ) {

        const today =
            Number(
                chartSource[i]
            ) || 0;

        const yesterday =
            Number(
                chartSource[i - 1]
            ) || 0;

        if (
            today <= 0 ||
            yesterday <= 0 ||
            today < yesterday
        ) {

            chart.push(0);
            continue;

        }

        chart.push(
            today - yesterday
        );

    }

    return {

        weeklyGain,

        dailyAverage,

        chart

    };

}

module.exports = {
    calculateWeeklyStats
};