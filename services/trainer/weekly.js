const logger = require('../logger');

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
    settings,
    period = 'current'
) {

    logger.service('trainer.generateWeeklyReport()');

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

        logger.calc('getCurrentWeekInfo()');

        const weekInfo =
            getCurrentWeekInfo(
                member.daily_fans ?? [],
                period
            );

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

        logger.calc('calculateWeeklyStats()');

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

        const fields = [
            {
                name: 'Weekly Fans',
                value: stats.weeklyGain.toLocaleString()
            },
            {
                name: 'Daily Average',
                value: stats.dailyAverage.toLocaleString()
            },
            {
                name: 'Goal Progress',
                value: `${quotaPercent}%`
            }
        ];

        if (!isChrono) {
            fields.push({
                name: 'Shame Score',
                value: String(member.shame_score ?? 0)
            });
        }

        // ===================================================
        // CURRENT GOAL (for progress bar color)
        //
        // The expected fan gain for the current point in the
        // current week. Used by the renderer to determine
        // whether the trainer is ahead/behind quota.
        // ===================================================

        const currentGoal =
            quotaInfo.dailyGoals[
                currentWeekIndex + 1
            ] * weekInfo.dayOfCurrentWeek;

        return {

            title:
                `Trainer Report — ${member.trainer_name}`,

            description:
                `Week ${currentWeekIndex + 1}\n` +
                `Goal: ${thresholdText}`,

            color: 0xff3b3b,

            reportType:
                'weekly',

            source:
                dataSource,

            footer:
                scrapedAtUtc
                    ? `Data source: ${dataSource} | Last data updated: ${scrapedAtUtc}`
                    : `Data source: ${dataSource}`,

            fields,

            chart:
                stats.chart,

            currentGoal

        };

    } catch (error) {

        logger.error(
            'trainer.generateWeeklyReport()',
            error
        );

        return {

            title: 'Error',

            description:
                error.message,

            color: 0xff0000,

            reportType:
                'weekly',

            source:
                row?.source ?? 'uma.moe',

            fields: [],

            chart: []

        };

    }

}

module.exports = {
    generateWeeklyReport
};