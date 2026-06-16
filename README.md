# Still-in-Love-Bot
# Still in Love Bot

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

The bot is self-hosted using Docker and managed through Portainer.

## Notes

* Environment variables are stored in `.env` and are not included in the repository.
* The included Dockerfile is currently retained for future containerized builds and is not used by the production deployment.
* Production currently runs from the official Node.js Docker image with Chromium installed at container startup.

## License

MIT License
