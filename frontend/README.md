# Poll Builder Frontend

A Vue 3 single-page application for creating multiple-choice polls, collecting anonymous votes,
and displaying live results. REST requests go through the Ocelot gateway, creator operations use
AuthMana JWTs, and live result updates come directly from VoteMana SignalR.

## Technology

- Vue 3 and Vue Router
- Vitest and Vue Test Utils
- ESLint, Oxlint, and Prettier
- AuthMana JWT authentication for creator operations
- SignalR client and Chart.js for live result charts

## Routes

| Path | View | Authentication metadata |
| --- | --- | --- |
| `/` | Landing page | Public |
| `/create` | Create poll | `requiresAuth: true` |
| `/poll/:code` | Vote | Public |
| `/poll/:code/results` | Live results | Public |
| `/poll/:code/manage` | Manage poll | `requiresAuth: true` |
| Any unmatched path | Not found | Public |

The router protects `/create` and `/poll/:code/manage`. Voting and public results do not require
login.

## Setup

Use Node.js 22.18+ or 24.12+. From the repository root:

```sh
cd frontend
npm install
cp .env.example .env.local
```

Set the API and SignalR URLs in `.env.local`. The example points REST traffic to the Render
gateway and SignalR traffic to VoteMana; use the local URLs from `INTEGRATION_SETUP.md` for local development.

## Commands

Start the development server:

```sh
npm run dev
```

Run the linters:

```sh
npm run lint
```

Run the unit tests:

```sh
npm run test:unit
```

Create a production build:

```sh
npm run build
```
