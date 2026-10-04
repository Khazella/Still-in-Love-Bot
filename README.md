# Still-in-Love-Bot

A Discord bot for the Uma Musume community focused on trainer analytics, fan growth tracking, and visual reporting.

## Features

* Trainer profile lookup via uma.moe
* Fan growth history and monthly trend analysis
* Circle (club) history tracking
* Trainer ranking and benchmark reports
* Automated report image generation using Puppeteer
* Interactive Discord slash commands
* Integration with external APIs and automation workflows

## Technology Stack

* Node.js
* Discord.js
* Puppeteer
* Docker
* GitHub
* n8n (automation workflows)

## Deployment

The bot is self-hosted using Dockerfile build manually as "discord-sil-bot:1.0" and Docker compose managed through Portainer.

## Trainer Timer

The Trainer Timer is a 50-minute timer board. It has **no fixed/configured location**: a board is created wherever `/timer-board` is run, so any channel or thread in the configured SiL guild can host its own independent board.

### How it works

- `/timer-board` creates a persistent board message in the current channel/thread (the location is determined from the interaction). Running it again in the same location reuses the existing board instead of creating a duplicate.
- Multiple boards are fully independent. A user can have one 50-minute timer per board (e.g. one in `#training` and a separate one in `#another-channel`).
- Users start/reset their own timer by clicking the `Start` button on a board. Clicking again in the same board resets that timer to a fresh 50 minutes.
- The board shows each active trainer with Discord-native timestamps (`Ends <t:UNIX:R> · <t:UNIX:t>`), localized per viewer. The embed description also shows the upcoming SiL offline window (`Still in Love offline at <t:...:t> - <t:...:t>`), anchored to Asia/Jakarta.
- When a timer expires, a random completion message mentions the user in that board's channel/thread, and the notification is auto-deleted after 10 minutes.
- No environment variable is required for the board location.

### How to set up a board

1. Run `node src/deploy-commands.js` to register the `/timer-board` command. It is deployed only to the configured SiL guild (existing private/guild command restriction).
2. In the channel or thread where you want the board, run `/timer-board`.
3. Users start their own timer by clicking the `Start` button on the board.

## Trainer Registration (`/register`)

`/register <trainer_id>` links a Discord account to a member's **permanent**
in-game Trainer ID (`viewer_id`). This is the foundation for the future
automatic quota reminder system — reminders themselves are not implemented yet.

### Identity mapping

The mapping is `Discord User ID <-> viewer_id`. IGN / trainer name is **not**
stored, because it can change; `viewer_id` is permanent.

`discord_username` is also stored, but **only** for display/management
convenience — it is never used as an identifier, since Discord usernames can
change. It is read automatically from `interaction.user` and refreshed on every
`/register`; the user never types it.

```text
Discord User ID:  123456789
discord_username: Khazella            <- display only, refreshed on each /register
viewer_id:        612906794711
IGN:              ExampleTrainer      <- not used for the mapping
```

### Behavior

- `/register 612906794711` reads the Discord User ID from the interaction and
  treats the argument as `viewer_id`.
- The `viewer_id` is validated against the **current Club First member data**
  (the same `uma_circle_latest` feed the bot refreshes roughly every 15
  minutes). Members who leave/quit/get kicked are removed from that data.
- One row per Discord user (re-registering updates the existing row) and one
  Discord user per `viewer_id`.
- The reply is ephemeral so registration details stay private.
- Registrations are permanent: they are **not** deleted when a member leaves
  Club First. Current Club First membership only determines reminder
  eligibility, so a member who leaves and later rejoins with the same
  `viewer_id` keeps their registration.

### Database

The mapping is stored in `discord_registrations` (created automatically at
startup and before each registration). See
`services/database/schema/registration.sql` for the canonical schema.

Columns: `id`, `discord_user_id` (unique identity key), `discord_username`
(nullable, display only), `viewer_id` (unique), `created_at`, `updated_at`.

For older databases created before `discord_username` existed, an idempotent
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS discord_username TEXT` migration runs
automatically; existing registrations are preserved and their username is
backfilled the next time that Discord user runs `/register`.

### Deploying the command

Run `node src/deploy-commands.js` to register `/register` with Discord.

## Notes

* Environment variables are stored in `.env` and are not included in the repository.
* The included Dockerfile is currently retained for future containerized builds and is not used by the production deployment.
* Production currently runs from the official Node.js Docker image with Chromium installed at container startup.
* The Project is coded using help from ChatGPT

## License

MIT License
