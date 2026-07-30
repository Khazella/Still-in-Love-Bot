const logger = require('../services/logger');

const LOCAL_COMMANDS = new Set([
    'club-report',
    'trainer',
    'quota-view',
    'quota-set'
]);

const {
    AttachmentBuilder
} = require('discord.js');

const {
    renderTemplate
} = require('../services/renderer');

const clubDb =
    require('../services/database/club');

const trainerDb =
    require('../services/database/trainer');

const clubSettingsDb =
    require('../services/database/club-settings');

const weeklyFans =
    require('../services/club-report/weekly');

const monthlyFans =
    require('../services/club-report/monthly');

const weeklyTrainer =
    require('../services/trainer/weekly');

const monthlyTrainer =
    require('../services/trainer/monthly');

const {
    getQuotaInfo
} = require('../services/calculations/quota');

async function handleLocalCommand(
    interaction,
    client
) {

    const commandName = interaction.commandName;

    logger.command(`/${commandName}`);
    logger.handler('handleLocalCommand');

    const startTime = Date.now();

    await interaction.deferReply();

    const options = {};

    for (
        const option
        of interaction.options.data
    ) {
        options[option.name] =
            option.value;
    }

    // =========================
    // LOCAL CLUB COMMAND
    // =========================

    if (
        interaction.commandName ===
        'club-report'
    ) {

        const source =
            options.source || 'uma';

        const latest =
            await clubDb.getLatestClubData(
                source
            );

        latest.source =
            source === 'chrono'
                ? 'chronogenesis.net'
                : 'uma.moe';

        const settings =
            await clubSettingsDb.getClubSettings(
                options.club
            );

        // =========================
        // GENERATE REPORT
        // =========================

        const period =
            options.period;

        const t1 = Date.now();

        const report =
            period === 'monthly'
                ? monthlyFans.generateMonthlyReport(
                    latest,
                    settings
                )
                : weeklyFans.generateWeeklyReport(
                    latest,
                    settings,
                    period
                );

        const serviceName =
            period === 'monthly'
                ? 'club-report.generateMonthlyReport()'
                : 'club-report.generateWeeklyReport()';

        logger.service(serviceName, Date.now() - t1);

        const t2 = Date.now();

        const imageBuffer =
            await renderTemplate(
                'club',
                report
            );

        logger.render('renderTemplate("club")', Date.now() - t2);

        const attachment =
            new AttachmentBuilder(
                imageBuffer,
                {
                    name: 'club.png'
                }
            );

        await interaction.editReply({
            files: [attachment]
        });

        logger.done(`/${commandName}`, Date.now() - startTime);

        return;

    }

    // =========================
    // LOCAL TRAINER COMMAND
    // =========================

    if (
        interaction.commandName ===
        'trainer'
    ) {

        const source =
            options.source || 'uma';

        const trainer =
            await trainerDb.getTrainer(
                options.name,
                source
            );

        if (!trainer) {

            await interaction.editReply(
                `Trainer "${options.name}" not found.`
            );

            return;

        }

        trainer.source =
            source === 'chrono'
                ? 'chronogenesis.net'
                : 'uma.moe';

        const settings =
            await clubSettingsDb.getClubSettings(
                'First'
            );

        const period =
            options.period;

        const t1 = Date.now();

        const report =
            period === 'monthly'
                ? monthlyTrainer.generateMonthlyReport(
                    trainer,
                    settings
                )
                : weeklyTrainer.generateWeeklyReport(
                    trainer,
                    settings,
                    period
                );

        const serviceName =
            period === 'monthly'
                ? 'trainer.generateMonthlyReport()'
                : 'trainer.generateWeeklyReport()';

        logger.service(serviceName, Date.now() - t1);

        const t2 = Date.now();

        const imageBuffer =
            await renderTemplate(
                'trainer',
                report
            );

        logger.render('renderTemplate("trainer")', Date.now() - t2);

        const attachment =
            new AttachmentBuilder(
                imageBuffer,
                {
                    name: 'trainer.png'
                }
            );

        await interaction.editReply({
            files: [attachment]
        });

        logger.done(`/${commandName}`, Date.now() - startTime);

        return;

    }

    // =========================
    // LOCAL QUOTA VIEW
    // =========================

    if (
        interaction.commandName ===
        'quota-view'
    ) {

        const club =
            interaction.options.getString(
                'club'
            );

        const settings =
            await clubSettingsDb.getClubSettings(
                club
            );

        if (!settings) {

            await interaction.editReply({
                content:
                    `Club "${club}" not found.`
            });

            return;

        }

        const quotaInfo =
            getQuotaInfo(settings);

        const embed = {

            title:
                `📋 ${settings.display_name} Quotas`,

            color: 0xff69b4,

            fields: [
                {
                    name:
                        'Current Quotas',

                    value:
                        `Week 1: ${(settings.week1_daily / 1000000).toFixed(1)}M/day → ${(quotaInfo.weeklyGoals[1] / 1000000).toFixed(1)}M\n` +
                        `Week 2: ${(settings.week2_daily / 1000000).toFixed(1)}M/day → ${(quotaInfo.weeklyGoals[2] / 1000000).toFixed(1)}M\n` +
                        `Week 3: ${(settings.week3_daily / 1000000).toFixed(1)}M/day → ${(quotaInfo.weeklyGoals[3] / 1000000).toFixed(1)}M\n` +
                        `Week 4: ${(settings.week4_daily / 1000000).toFixed(1)}M/day → ${(quotaInfo.weeklyGoals[4] / 1000000).toFixed(1)}M\n\n` +
                        `Monthly Goal: ${(quotaInfo.monthlyGoal / 1000000).toFixed(1)}M`

                }
            ]

        };

        await interaction.editReply({
            embeds: [embed]
        });

        logger.done(`/${commandName}`, Date.now() - startTime);

        return;

    }

    // =========================
    // LOCAL QUOTA SET
    // =========================

    if (
        interaction.commandName ===
        'quota-set'
    ) {

        const club =
            interaction.options.getString(
                'club'
            );

        const week =
            interaction.options.getInteger(
                'week'
            );

        const daily =
            interaction.options.getInteger(
                'daily'
            );

        const updated =
            await clubSettingsDb.updateWeekGoal(
                club,
                week,
                daily
            );

        if (!updated) {

            await interaction.editReply({
                content:
                    `Club "${club}" not found.`
            });

            return;

        }

        const embed = {

            title:
                '✅ Quota Updated',

            color:
                0x57f287,

            fields: [
                {
                    name:
                        'Club',

                    value:
                        updated.display_name,

                    inline: true
                },
                {
                    name:
                        'Week',

                    value:
                        String(week),

                    inline: true
                },
                {
                    name:
                        'Daily Goal',

                    value:
                        `${(daily / 1000000).toFixed(1)}M/day`
                }
            ]

        };

        await interaction.editReply({
            embeds: [embed]
        });

        logger.done(`/${commandName}`, Date.now() - startTime);

        return;

    }

}

module.exports = {
    LOCAL_COMMANDS,
    handleLocalCommand
};
