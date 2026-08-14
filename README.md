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

## Notes

* Environment variables are stored in `.env` and are not included in the repository.
* The included Dockerfile is currently retained for future containerized builds and is not used by the production deployment.
* Production currently runs from the official Node.js Docker image with Chromium installed at container startup.
* The Project is coded using help from ChatGPT

## License

MIT License
