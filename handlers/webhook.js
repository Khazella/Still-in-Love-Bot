const logger = require('../services/logger');

const axios = require('axios');

const {
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    renderTemplate
} = require('../services/renderer');

const benchmarkDb =
    require('../services/database/benchmark');

const {
    CLUB_FIRST_NAME,
    toJakartaDate,
    getMonthRange,
    buildClubDailyGrowth,
    mergeClubGrowthIntoChart,
    getLatestSnapshot,
    buildClubBenchmarkRow
} = require('../services/calculations/benchmark');

// =========================
// TITLE FORMAT
// =========================
function formatTitle(cmd) {

    if (!cmd) {
        return 'Report';
    }

    return cmd
        .replace(/_/g, ' ')
        .replace(
            /\b\w/g,
            c => c.toUpperCase()
        );

}

// =========================
// RENDERABLE DETECTION
// =========================
function isRenderable(data) {

    if (
        Array.isArray(data?.rows) &&
        data.rows.length > 0
    ) {
        return true;
    }

    if (
        Array.isArray(data?.fields) &&
        data.fields.length > 0
    ) {
        return true;
    }

    if (
        data?.trainer_name &&
        Array.isArray(data?.fan_history)
    ) {
        return true;
    }

    // NEW benchmark format
    if (
        data?.current &&
        Array.isArray(data?.chart)
    ) {
        return true;
    }

    return false;

}

// =========================
// N8N RESPONSE NORMALIZER
// =========================
function normalizeN8nResponse(raw) {

    return Array.isArray(raw)
        ? raw[0]
        : raw?.data
            ? raw.data
            : raw;

}

// =========================
// IMAGE COMMANDS
// =========================
const IMAGE_COMMANDS = {

    benchmark: () =>
        'benchmark',

    screen: () =>
        'screen-report'

};

// =========================
// EMBED BUILDER
// =========================
function buildNormalEmbed(
    data,
    commandName
) {

    const embed =
        new EmbedBuilder()
            .setColor(
                data.color ||
                0xff3b3b
            )
            .setTitle(
                data.title ||
                formatTitle(commandName)
            )
            .setDescription(
                data.description ||
                'Report generated'
            );

    if (
        data.url &&
        typeof data.url === 'string'
    ) {

        embed.setURL(
            data.url
        );

    }

    if (
        data.thumbnail &&
        typeof data.thumbnail === 'string'
    ) {

        embed.setThumbnail(
            data.thumbnail
        );

    }

    if (
        data.image &&
        typeof data.image === 'string'
    ) {

        embed.setImage(
            data.image
        );

    }

    if (
        Array.isArray(data.fields)
    ) {

        embed.addFields(

            data.fields.map(
                field => ({

                    name:
                        field.name,

                    value:
                        field.value,

                    inline:
                        field.inline ?? false

                })
            )

        );

    }

    embed.setFooter({

        text:
            data.footer ||
            'n8n analytics'

    });

    embed.setTimestamp();

    return embed;

}

// =========================
// BENCHMARK CLUB SERIES
// =========================
/**
 * Add Club "First" to the benchmark output.
 *
 *  - The Daily Benchmark Growth chart gets a `first` value on every
 *    row, using the exact same daily-growth definition as the
 *    Top 10 / Top 30 / Top 100 lines and the same day alignment.
 *  - The Current Benchmark table gets a `first` row whose Entry /
 *    Average figures use the same methodology as the benchmark rows.
 *
 * Nothing from the existing benchmark response is altered; the club
 * data is only added. Failure is logged and ignored so /benchmark
 * still renders with the original benchmark output.
 *
 * @param {object} data - normalized benchmark response
 */
async function attachClubFirstSeries(data) {

    if (
        !Array.isArray(data?.chart) ||
        data.chart.length === 0
    ) {
        return;
    }

    try {

        const referenceDate =
            data.snapshot_date
                ? new Date(data.snapshot_date)
                : new Date();

        const reference =
            Number.isNaN(
                referenceDate.getTime()
            )
                ? toJakartaDate(new Date())
                : toJakartaDate(referenceDate);

        const {
            startDate,
            endDate
        } = getMonthRange(
            reference.getFullYear(),
            reference.getMonth() + 1
        );

        const snapshots =
            await benchmarkDb.getClubSnapshots(
                CLUB_FIRST_NAME,
                startDate,
                endDate
            );

        const growth =
            buildClubDailyGrowth(snapshots);

        data.chart =
            mergeClubGrowthIntoChart(
                data.chart,
                growth
            );

        // Current Benchmark row for Club First.
        // The benchmark divides cumulative fans by the number of
        // benchmark days, which is exactly the chart row count.
        const latest =
            getLatestSnapshot(snapshots);

        if (latest && data.current) {

            data.current.first =
                buildClubBenchmarkRow(
                    latest.fans,
                    data.chart.length
                );

        }

    } catch (error) {

        logger.error(
            'benchmark.attachClubFirstSeries()',
            error
        );

    }

}

// =========================
// WEBHOOK COMMANDS
// =========================
async function handleWebhookCommand(
    interaction
) {

    const commandName = interaction.commandName;

    logger.command(`/${commandName}`);
    logger.handler('handleWebhookCommand');

    const startTime = Date.now();

    await interaction.deferReply();

    try {

        const options = {};

        for (
            const option
            of interaction.options.data
        ) {

            options[option.name] =
                option.value;

        }

        const response =
            await axios.post(
                process.env.N8N_WEBHOOK,
                {
                    command:
                        interaction.commandName,
                    options,
                    user:
                        interaction.user.username,
                    guild:
                        interaction.guild?.name
                }
            );

        const data =
            normalizeN8nResponse(
                response.data
            );

        if (
            interaction.commandName ===
            'benchmark'
        ) {

            await attachClubFirstSeries(data);

        }

        const templateResolver =
            IMAGE_COMMANDS[
                interaction.commandName
            ];

        if (
            templateResolver &&
            isRenderable(data)
        ) {

            const templateName =
                templateResolver(
                    options
                );

            const t1 = Date.now();

            const imageBuffer =
                await renderTemplate(
                    templateName,
                    data
                );

            logger.render(`renderTemplate("${templateName}")`, Date.now() - t1);

            const attachment =
                new AttachmentBuilder(
                    imageBuffer,
                    {
                        name:
                            `${templateName}.png`
                    }
                );

            const components = [];

            if (
                interaction.commandName === 'screen' &&
                data.profile_url
            ) {

                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel(
                                    'Open Profile'
                                )
                                .setStyle(
                                    ButtonStyle.Link
                                )
                                .setURL(
                                    data.profile_url
                                )
                        )
                );

            }

            await interaction.editReply({

                content: null,

                embeds: [],

                files: [
                    attachment
                ],

                components

            });

            logger.done(`/${commandName}`, Date.now() - startTime);

            return;

        }
        const embed =
            buildNormalEmbed(
                data,
                interaction.commandName
            );

        await interaction.editReply({

            embeds: [
                embed
            ],

            content: null

        });

        logger.done(`/${commandName}`, Date.now() - startTime);

    } catch (error) {

        logger.error(
            `/${commandName}`,
            error
        );

        const localCommands = [

            'club-report',

            'trainer',

            'quota-view',

            'quota-set'

        ];

        const isLocalCommand =
            localCommands.includes(
                interaction.commandName
            );

        if (
            interaction.deferred ||
            interaction.replied
        ) {

            await interaction.editReply(

                isLocalCommand

                    ? 'Still in Love was too busy chasing you, Trainer-san, and forgot to finish the report. Please try again later.'

                    : 'Still in Love sent a request to the support team, but nobody answered the phone. Please try again later.'

            );

        }

    }

}

module.exports = {
    handleWebhookCommand
};