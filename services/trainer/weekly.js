const {
    getGoalInfo
} = require('../fans/goals');

const DAYS_PER_WEEK = 7;

function getCurrentWeekInfo() {

    const jakartaNow = new Date(
        new Date().toLocaleString(
            'en-US',
            {
                timeZone: 'Asia/Jakarta'
            }
        )
    );

    const effectiveDay =
        Math.max(
            1,
            jakartaNow.getDate() - 1
        );

    const currentWeekIndex =
        Math.floor(
            (effectiveDay - 1) /
            DAYS_PER_WEEK
        );

    const dayOfCurrentWeek =
        ((effectiveDay - 1) %
            DAYS_PER_WEEK) + 1;

    return {
        effectiveDay,
        currentWeekIndex,
        dayOfCurrentWeek
    };

}

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

        const {
            effectiveDay,
            currentWeekIndex,
            dayOfCurrentWeek
        } = getCurrentWeekInfo();

        const goalInfo =
            getGoalInfo(settings);

        const weeklyGoal =
            goalInfo.weeklyGoals[
                currentWeekIndex + 1
            ] || 0;

        const thresholdText =
            `${(
                weeklyGoal /
                1_000_000
            ).toFixed(1)}M`;

        const dailyTotals =
            Array.isArray(
                member.daily_fans
            )
                ? member.daily_fans
                : [];

        const activeData =
            dailyTotals.slice(
                0,
                Math.min(
                    effectiveDay + 1,
                    dailyTotals.length
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
                Math.floor(
                    (i - 1) /
                    DAYS_PER_WEEK
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

        const quotaPercent =
            weeklyGoal > 0
                ? (
                    weeklyGain /
                    weeklyGoal *
                    100
                ).toFixed(2)
                : '0.00';

        const weekStartDay =
            currentWeekIndex *
            DAYS_PER_WEEK;

        const chartSource =
            dailyTotals.slice(
                weekStartDay,
                Math.min(
                    weekStartDay +
                    dayOfCurrentWeek +
                    1,
                    dailyTotals.length
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
                        weeklyGain.toLocaleString()
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
                'weekly',

            fields: [],

            chart: []

        };

    }

}

module.exports = {
    generateWeeklyReport
};