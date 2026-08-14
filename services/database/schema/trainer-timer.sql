-- =====================================================================
-- Trainer Timer schema (PostgreSQL)
-- =====================================================================
-- The bot also creates these tables automatically at startup via
-- ensureSchema() in services/database/trainer-timer.js. This file is the
-- canonical reference for manual setup / troubleshooting.
--
-- Location note: there is NO configured board location. A board is created
-- wherever `/timer-board` is run (any channel or thread within the configured
-- SiL guild). The `thread_id` column stores that Discord channel/thread ID
-- (from interaction.channelId) and is therefore the board location. Multiple
-- independent boards are fully supported, and a user can have one timer per
-- board (UNIQUE(user_id, thread_id)).
--
-- Timezone note: all timestamps are TIMESTAMPTZ (timezone-safe).
-- ends_at is the single source of truth for the countdown; the bot never
-- stores a decrementing "seconds remaining" value.
-- =====================================================================

CREATE TABLE IF NOT EXISTS trainer_timers (
    id         BIGSERIAL PRIMARY KEY,
    user_id    TEXT        NOT NULL,               -- Discord user ID
    thread_id  TEXT        NOT NULL,               -- Discord channel/thread ID containing the board
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at    TIMESTAMPTZ NOT NULL,               -- source of truth
    status     TEXT        NOT NULL DEFAULT 'active', -- active | completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trainer_timers_user_thread UNIQUE (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_timers_status_ends
    ON trainer_timers (status, ends_at);

-- One persistent board message per channel/thread (board location). Prevents
-- duplicate boards when /timer-board is run more than once in the same place.
CREATE TABLE IF NOT EXISTS trainer_timer_boards (
    id         BIGSERIAL PRIMARY KEY,
    thread_id  TEXT        NOT NULL UNIQUE,        -- Discord channel/thread ID containing the board
    message_id TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
