-- =====================================================================
-- Discord Registration schema (PostgreSQL)
-- =====================================================================
-- The bot also creates this table automatically at startup via
-- ensureSchema() in services/database/registration.js. This file is the
-- canonical reference for manual setup / troubleshooting.
--
-- Purpose: map a Discord user to their permanent in-game Trainer ID
-- (viewer_id) for the future automatic quota reminder system.
--
--   Discord User ID  <->  viewer_id
--
-- discord_user_id is the permanent Discord identity/key. discord_username is
-- stored ONLY as a display/management convenience and is refreshed on every
-- registration — it is NEVER used as a unique identifier (Discord usernames
-- can change).
--
-- IGN / trainer name is intentionally NOT stored: it can change, while
-- viewer_id is the permanent identifier.
--
-- Relationship to Club First membership: registrations are permanent and
-- are NOT deleted when a member leaves Club First. Current Club First
-- membership (uma_circle_latest / chrono_circle_latest) determines whether
-- the person is currently eligible for reminders. If someone leaves and
-- later rejoins with the same viewer_id, the existing registration still
-- applies.
--
-- Timezone note: all timestamps are TIMESTAMPTZ (timezone-safe).
-- =====================================================================

CREATE TABLE IF NOT EXISTS discord_registrations (
    id               BIGSERIAL   PRIMARY KEY,                -- internal primary key
    discord_user_id  TEXT        NOT NULL,                   -- Discord user ID (permanent identity key)
    discord_username TEXT,                                   -- current Discord username (display only; nullable)
    viewer_id        TEXT        NOT NULL,                   -- permanent in-game Trainer ID
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_discord_registrations_discord_user_id UNIQUE (discord_user_id), -- one registration per Discord user
    CONSTRAINT uq_discord_registrations_viewer_id       UNIQUE (viewer_id)         -- one Discord user per viewer_id
);

-- Migration for databases where discord_registrations was created before the
-- discord_username column existed. Nullable + IF NOT EXISTS, so existing
-- registrations are preserved and are backfilled with the username the next
-- time that Discord user runs /register.
ALTER TABLE discord_registrations
    ADD COLUMN IF NOT EXISTS discord_username TEXT;
