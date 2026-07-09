const LOCAL_COMMANDS = new Set([
    'club-report',
    'chrono',
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

        const latest =
            await clubDb.getLatestClubData();

        latest.source = 'uma.moe';

        const settings =
            await clubSettingsDb.getClubSettings(
                'First'
            );

        const report =
            options.period === 'weekly'
                ? weeklyFans.generateWeeklyReport(
                    latest,
                    settings
                )
                : monthlyFans.generateMonthlyReport(
                    latest,
                    settings
                );

        const imageBuffer =
            await renderTemplate(
                'club',
                report
            );

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

        return;

    }

    // =========================
    // LOCAL CHRONOGENESIS COMMAND
    // =========================

    if (
        interaction.commandName ===
        'chrono'
    ) {

        const latest =
            await clubDb.getLatestChronoData();

        latest.source =
            'chronogenesis.net';

        const settings =
            await clubSettingsDb.getClubSettings(
                'First'
            );

        const report =
            options.period === 'weekly'
                ? weeklyFans.generateWeeklyReport(
                    latest,
                    settings
                )
                : monthlyFans.generateMonthlyReport(
                    latest,
                    settings
                );

        const imageBuffer =
            await renderTemplate(
                'club',
                report
            );

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

        return;

    }

    // =========================
    // LOCAL TRAINER COMMAND
    // =========================

    if (
        interaction.commandName ===
        'trainer'
    ) {

        const trainer =
            await trainerDb.getTrainer(
                options.name
            );

        if (!trainer) {

            await interaction.editReply(
                `Trainer "${options.name}" not found.`
            );

            return;

        }

        const settings =
            await clubSettingsDb.getClubSettings(
                'First'
            );

        const report =
            options.period === 'weekly'
                ? weeklyTrainer.generateWeeklyReport(
                    trainer,
                    settings
                )
                : monthlyTrainer.generateMonthlyReport(
                    trainer,
                    settings
                );

        const imageBuffer =
            await renderTemplate(
                'trainer',
                report
            );

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

        return;

    }

}

module.exports = {
    LOCAL_COMMANDS,
    handleLocalCommand
};