# Project Instructions

## Project
Production-ready real-time chat app for a study abroad agency.

Stack:
- React Native CLI + TypeScript
- Node.js + Express + TypeScript
- MySQL
- Socket.io
- Firebase Cloud Messaging
- Docker

## Global Rules
- Always write production-ready code.
- Generate complete files, not fragments.
- Never leave TODO or placeholder code.
- Never remove working functionality unless explicitly asked.
- Keep TypeScript strict.
- Avoid `any`.
- Never suppress TypeScript errors.
- Always update imports.
- Prefer readable, maintainable code over clever code.
- Use environment variables for configuration.
- Never hardcode secrets.
- Never modify Firebase config files unless explicitly requested.

## Required Reading
Before major implementation work, read:
- `README_ARCHITECTURE.md`
- `README_EVOLUTION.md`
- `PROMPT_RULES.md`

## Architecture
Follow existing architecture unless explicitly instructed otherwise.

Backend must use:

Controller  
→ Service  
→ Repository  
→ Database

Frontend must use:
- typed navigation
- API service layer
- isolated auth state
- isolated chat/socket state
- reusable components where practical

## Docker
The project is developed through Docker where possible.
Prefer Docker commands for:
- database
- backend services
- migrations/seeding
- test databases

## Firebase
Firebase files are stored in:

`firebase-configs/`

Use existing files:
- `firebase-service-account.json`
- `google-services.json`

Do not regenerate them.

## Definition of Done
A task is complete only when:
- code builds
- TypeScript passes
- relevant tests pass where practical
- no placeholder code remains
- imports are valid
- documentation is updated when behavior changes