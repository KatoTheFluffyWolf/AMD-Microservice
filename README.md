# Poll Builder

A real-time polling web application built with **Vue 3**, **ASP.NET Core**, **PostgreSQL**, and **SignalR**.

Users can register and log in to create polls, share a short poll link, collect one vote per browser/session, view live results, and close polls when voting is finished.

## Live Deployment

* **Frontend:** https://amd-microservice.vercel.app
* **API Gateway:** https://apigateway-14el.onrender.com

> Backend services are hosted on Render and may take a short time to wake up after being inactive.

## Main Features

* User registration and login
* JWT authentication with ASP.NET Core Identity
* Create polls with 2–6 answer options
* Short shareable poll codes
* Public voting without requiring voter accounts
* Duplicate-vote prevention using a voter token
* Live result updates using SignalR
* Poll closing by the creator
* PostgreSQL database storage
* Backend and frontend unit tests

## Architecture

The final system uses a microservice architecture:

```text
Vue 3 Frontend
      |
      v
 API Gateway
      |
  +---+---------+
  |             |
  v             v
AuthMana     PollMana
                 |
                 v
              VoteMana
                 
      |
      v
Neon PostgreSQL
```

### Services

* **AuthMana** — registration, login, ASP.NET Identity, and JWT generation
* **PollMana** — poll creation, retrieval, validation, and closing
* **VoteMana** — vote validation, duplicate-vote checking, vote storage, and results
* **API Gateway** — routes frontend requests to the correct microservice
* **SignalR** — broadcasts updated poll results to connected clients

## Technology Stack

| Area           | Technology             |
| -------------- | ---------------------- |
| Frontend       | Vue 3 + Vue Router     |
| Backend        | ASP.NET Core Web API   |
| Database       | PostgreSQL / Neon      |
| ORM            | Entity Framework Core  |
| Authentication | ASP.NET Identity + JWT |
| Real-time      | SignalR                |
| Testing        | xUnit + Vitest         |
| Containers     | Docker                 |
| CI/CD          | GitHub Actions         |
| Deployment     | Vercel + Render        |

## Main Request Flow

```text
Vue Frontend
     |
     v
API Gateway
     |
     v
Microservice
     |
     v
Entity Framework Core
     |
     v
PostgreSQL
```

For voting:

```text
Vote submitted
     |
     v
VoteMana validates vote
     |
     +-- Poll exists?
     +-- Poll open?
     +-- Option valid?
     +-- Already voted?
     |
     v
Vote saved
     |
     v
SignalR broadcasts updated results
```

## Running Locally

### Requirements

* .NET SDK
* Node.js / npm
* PostgreSQL-compatible database

Clone the repository:

```bash
git clone <repository-url>
cd <repository-folder>
```

Restore backend dependencies:

```bash
dotnet restore
```

Run the backend services:

```bash
dotnet run --project AuthMana
dotnet run --project PollMana
dotnet run --project VoteMana
dotnet run --project ApiGateway
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Database connection strings and JWT configuration should be provided through local configuration or environment variables.

## Testing

Run backend tests:

```bash
dotnet test
```

Run frontend tests:

```bash
cd frontend
npm run test:unit
```

## CI/CD

The project uses GitHub Actions to automate the deployment workflow:

```text
Push to main
    ↓
GitHub Actions
    ↓
Build + Tests
    ↓
Docker Image
    ↓
Deploy to Render
```

The frontend is deployed separately through Vercel.
