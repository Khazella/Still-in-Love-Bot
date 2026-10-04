const logger = require('../services/logger');

const clubDb =
    require('../services/database/club');

const registrationDb =
    require('../services/database/registration');

// viewer_id is the permanent in-game Trainer ID: digits only. It is treated
// as an opaque string (never a number) so large IDs are preserved exactly.
const VIEWER_ID_PATTERN = /^\d{1,20}$/;

// =========================
// USER-FACING MESSAGES
// =========================
const MESSAGES = {

    invalidTrainerId:
        '❌ Invalid Trainer ID. Please provide your permanent numeric Trainer ID (viewer_id).',

    notInClub:
        '❌ Trainer ID not found in Club First. Make sure you are currently a Club First member and entered your permanent Trainer ID.',

    alreadyRegisteredToOther:
        '❌ This Trainer ID is already registered to another Discord account.',

    alreadyRegistered:
        '✅ Your Trainer ID is already registered.',

    updated:
        '✅ Your Trainer ID registration has been updated successfully.',

    registered:
        '✅ Your Trainer ID has been registered successfully.',

    genericError:
        '⚠️ Something went wrong while saving your registration. Please try again later.'

};

/**
 * Handle the /register slash command.
 *
 * Flow:
 *   Discord /register <trainer_id>
 *     -> read Discord User ID + current Discord username from the interaction
 *     -> validate the supplied viewer_id against CURRENT Club First data
 *     -> reject if the viewer_id is unknown, or already owned by another
 *        Discord account
 *     -> insert/update the discord_user_id <-> viewer_id mapping and always
 *        refresh discord_username + updated_at
 *     -> reply (ephemeral) with a clear success/error message
 *
 * The Discord username is read automatically from interaction.user — the user
 * never types it. `discord_user_id` remains the identity key; the username is
 * stored only for display/management convenience and may change over time.
 *
 * Assumes the interaction has already been deferred (editReply is used) and
 * that the reply is ephemeral so registration details stay private.
 *
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function handleRegisterCommand(interaction) {

    logger.handler('handleRegisterCommand');

    const discordUserId =
        interaction.user.id;

    // Current Discord username, taken directly from the interaction. Display
    // only — never an identifier.
    const discordUsername =
        interaction.user.username;

    // Never expose raw DB errors to Discord: catch everything here and reply
    // with a friendly message, logging the technical detail server-side.
    try {

        // Required to already exist before we can write — idempotent, and
        // memoized after the first successful startup call.
        await registrationDb.ensureSchema();

        // =========================
        // 1. VALIDATE INPUT FORMAT
        // =========================

        const viewerId =
            String(
                interaction.options.getString(
                    'trainer_id'
                ) ?? ''
            ).trim();

        if (
            !VIEWER_ID_PATTERN.test(
                viewerId
            )
        ) {

            await interaction.editReply({
                content:
                    MESSAGES.invalidTrainerId
            });

            return;

        }

        // =========================
        // 2. VALIDATE AGAINST CURRENT CLUB FIRST DATA
        // =========================

        const member =
            await clubDb.findMemberByViewerId(
                viewerId
            );

        if (!member) {

            await interaction.editReply({
                content:
                    MESSAGES.notInClub
            });

            return;

        }

        // =========================
        // 3. CHECK viewer_id OWNERSHIP
        // =========================

        const byViewer =
            await registrationDb.getByViewerId(
                viewerId
            );

        if (
            byViewer &&
            byViewer.discord_user_id !==
                discordUserId
        ) {

            await interaction.editReply({
                content:
                    MESSAGES.alreadyRegisteredToOther
            });

            return;

        }

        // =========================
        // 4. CHECK EXISTING DISCORD REGISTRATION
        // =========================

        const byUser =
            await registrationDb.getByDiscordUserId(
                discordUserId
            );

        // =========================
        // 5. INSERT / UPDATE MAPPING
        //
        // Always upsert so discord_username and updated_at are refreshed on
        // every run — even when the viewer_id mapping itself is unchanged.
        // This also backfills discord_username for rows created before the
        // column existed.
        // =========================

        await registrationDb.upsertRegistration(
            discordUserId,
            viewerId,
            discordUsername
        );

        const content =
            byUser
                ? (
                    byUser.viewer_id ===
                    viewerId
                        ? MESSAGES.alreadyRegistered
                        : MESSAGES.updated
                )
                : MESSAGES.registered;

        await interaction.editReply({
            content
        });

    } catch (error) {

        logger.error(
            '/register',
            error
        );

        // Unique-constraint race (a viewer_id claimed between our check and
        // write): report the friendly conflict instead of a DB error.
        const content =
            error.code === '23505'
                ? MESSAGES.alreadyRegisteredToOther
                : MESSAGES.genericError;

        try {

            await interaction.editReply({
                content
            });

        } catch (replyError) {

            logger.error(
                '/register (reply)',
                replyError
            );

        }

    }

}

module.exports = {
    handleRegisterCommand
};
