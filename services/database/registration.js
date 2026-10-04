const pool = require('./postgres');

/**
 * Database access for the Discord <-> Trainer ID (viewer_id) registration
 * mapping.
 *
 * This is the permanent identity mapping used by the future automatic quota
 * reminder system:
 *
 *     Discord User ID  <->  viewer_id
 *
 * `discord_user_id` is the permanent Discord identity/key. `discord_username`
 * is stored ONLY as a display/management convenience and is refreshed on every
 * registration — it is never used as a unique identifier (Discord usernames
 * can change).
 *
 * IGN / trainer name is intentionally NOT stored here — it can change, while
 * `viewer_id` is the permanent in-game identifier.
 *
 * Registrations are intentionally decoupled from current Club First
 * membership. If a member leaves and later rejoins Club First with the same
 * permanent `viewer_id`, the existing mapping is still valid.
 */

// Memoized schema creation. The first caller runs the DDL; everyone else
// reuses the same promise. On failure the cache is cleared so a later call
// (e.g. a /register invocation) can retry.
let schemaPromise = null;

/**
 * Create the discord_registrations table if it does not already exist, and add
 * the discord_username column to pre-existing tables that predate it.
 *
 * Idempotent — safe to run on every startup and before each registration. The
 * ADD COLUMN IF NOT EXISTS migration is nullable so existing registrations are
 * preserved untouched; their discord_username simply stays NULL until the
 * Discord user runs /register again (which backfills it).
 */
function ensureSchema() {
    if (!schemaPromise) {
        schemaPromise = pool
            .query(`
                CREATE TABLE IF NOT EXISTS discord_registrations (
                    id               BIGSERIAL   PRIMARY KEY,
                    discord_user_id  TEXT        NOT NULL,
                    discord_username TEXT,                          -- display only, not an identity key
                    viewer_id        TEXT        NOT NULL,
                    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT uq_discord_registrations_discord_user_id UNIQUE (discord_user_id),
                    CONSTRAINT uq_discord_registrations_viewer_id       UNIQUE (viewer_id)
                );

                -- Migration for tables created before discord_username existed.
                -- Nullable + IF NOT EXISTS: existing rows and re-runs are safe.
                ALTER TABLE discord_registrations
                    ADD COLUMN IF NOT EXISTS discord_username TEXT;
            `)
            .catch(error => {
                schemaPromise = null;
                throw error;
            });
    }

    return schemaPromise;
}

/**
 * Get the registration owned by a Discord user, or null.
 *
 * @param {string} discordUserId
 */
async function getByDiscordUserId(discordUserId) {
    const result = await pool.query(
        `
        SELECT *
        FROM discord_registrations
        WHERE discord_user_id = $1
        `,
        [discordUserId]
    );

    return result.rows[0] ?? null;
}

/**
 * Get the registration that owns a viewer_id, or null.
 *
 * @param {string} viewerId
 */
async function getByViewerId(viewerId) {
    const result = await pool.query(
        `
        SELECT *
        FROM discord_registrations
        WHERE viewer_id = $1
        `,
        [viewerId]
    );

    return result.rows[0] ?? null;
}

/**
 * Insert or update a Discord user's registration.
 *
 * ON CONFLICT (discord_user_id) guarantees exactly one row per Discord user,
 * so re-registering updates the existing mapping instead of creating a
 * duplicate, and always refreshes discord_username + updated_at (including for
 * rows originally created before discord_username existed). The
 * UNIQUE(viewer_id) constraint is the final guard that keeps a viewer_id from
 * being claimed by two Discord accounts; a violation surfaces as a Postgres
 * 23505 error which callers translate into a friendly message.
 *
 * @param {string} discordUserId
 * @param {string} viewerId
 * @param {string} [discordUsername] - current Discord username (display only)
 */
async function upsertRegistration(discordUserId, viewerId, discordUsername) {
    const result = await pool.query(
        `
        INSERT INTO discord_registrations (discord_user_id, discord_username, viewer_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (discord_user_id)
        DO UPDATE SET
            discord_username = EXCLUDED.discord_username,
            viewer_id        = EXCLUDED.viewer_id,
            updated_at       = NOW()
        RETURNING *
        `,
        [discordUserId, discordUsername ?? null, viewerId]
    );

    return result.rows[0];
}

module.exports = {
    ensureSchema,
    getByDiscordUserId,
    getByViewerId,
    upsertRegistration
};
