# Poll Builder Frontend

A Vue 3 single-page application for authenticated poll creation, anonymous voting, and live
results. REST requests use the Ocelot gateway, while SignalR connects directly to VoteMana.

## Technology

- Vue 3 and Vue Router
- Native `fetch` for REST requests
- AuthMana JWT authentication stored in `sessionStorage`
- SignalR client and Chart.js
- Vitest and Vue Test Utils
- ESLint, Oxlint, and Prettier

No external authentication SDK, Pinia, or Axios is used.

## Routes

| Path                  | View                 | Access                |
| --------------------- | -------------------- | --------------------- |
| `/`                   | Landing page         | Public                |
| `/login`              | Creator login        | Signed out            |
| `/register`           | Creator registration | Signed out            |
| `/create`             | Create poll          | Authenticated creator |
| `/poll/:code`         | Vote                 | Public                |
| `/poll/:code/results` | Live results         | Public                |
| `/poll/:code/manage`  | Manage poll          | Authenticated creator |
| Any unmatched path    | Not found            | Public                |

The router sends unauthenticated creator routes to `/login?redirect=<local-path>`. Login and
registration accept only safe local redirects. Creator JWTs are attached only to protected poll
requests; voting and public results remain anonymous.

## Setup

Use Node.js 22.18+ or 24.12+. From the repository root:

```sh
cd frontend
npm install
cp .env.example .env.local