# Poll Builder Coursework Backend

This solution adapts the supplied classroom microservice template to the Poll & Survey Builder coursework.

## Projects

- **ApiGateway** - Ocelot API gateway. Vue should send normal REST requests here.
- **AuthMana** - ASP.NET Core Identity registration/login and JWT generation.
- **PollMana** - owns poll creation, retrieval, closing, and poll options.
- **VoteMana** - owns votes, result aggregation, and the SignalR hub.

The structure deliberately mirrors the lecture solution: multiple ASP.NET Core services inside one `.slnx` solution, with Ocelot routing between the client and services.

## Database model

The implementation matches the coursework ERD conceptually:

- `AspNetUsers`
- `Polls`
- `PollOptions`
- `Vote`

Important rules:

- One user may create many polls.
- One poll has 2-6 options.
- A poll option belongs to one poll.
- A logged-in user may vote only once per poll (`PollID + UserID` is unique).
- `PollID + PollOptionID` is also validated so a vote cannot select an option belonging to another poll.

All services are configured to use the same Neon PostgreSQL database to match the classroom template and the coursework ERD. This is a shared-database microservice-style coursework architecture, not strict database-per-service microservices.

## Local ports

| Project | HTTPS |
|---|---:|
| ApiGateway | 5000 |
| AuthMana | 7278 |
| PollMana | 7088 |
| VoteMana | 7045 |

Vue is assumed to run at `http://localhost:5173` during development.

## 1. Configure Neon

Replace `PASTE_NEON_CONNECTION_STRING_HERE` in the three service `appsettings.json` files with the same Neon PostgreSQL connection string:

- `AuthMana/appsettings.json`
- `PollMana/appsettings.json`
- `VoteMana/appsettings.json`

For a real repository, prefer user-secrets/environment variables rather than committing the connection string.

## 2. Configure JWT

All three services must use exactly the same `Jwt:Key`, `Jwt:Issuer`, and `Jwt:Audience` values. Replace the development key before deployment.

## 3. Create the database using EF Core migrations

Run migrations in this order because later services reference tables created by earlier services.

### Authentication tables first

```bash
dotnet ef migrations add AuthInitial \
  --project AuthMana \
  --startup-project AuthMana \
  --context AuthContext

dotnet ef database update \
  --project AuthMana \
  --startup-project AuthMana \
  --context AuthContext
```

### Polls and options second

```bash
dotnet ef migrations add PollInitial \
  --project PollMana \
  --startup-project PollMana \
  --context PollContext

dotnet ef database update \
  --project PollMana \
  --startup-project PollMana \
  --context PollContext
```

### Votes last

```bash
dotnet ef migrations add VoteInitial \
  --project VoteMana \
  --startup-project VoteMana \
  --context VoteContext

dotnet ef database update \
  --project VoteMana \
  --startup-project VoteMana \
  --context VoteContext
```

Each context uses its own EF migrations history table in the shared Neon database.

## 4. Run the services

Start all four projects. In Visual Studio, configure multiple startup projects, or run each project from a separate terminal:

```bash
dotnet run --project AuthMana
dotnet run --project PollMana
dotnet run --project VoteMana
dotnet run --project ApiGateway
```

REST requests from Vue should go through:

```text
https://localhost:5000/gateway/...
```

## API through the gateway

### Authentication

- `POST /gateway/auth/register`
- `POST /gateway/auth/login`
- `GET /gateway/auth/me`

### Polls

- `POST /gateway/polls` - authenticated creator
- `GET /gateway/polls/{code}` - load poll
- `GET /gateway/polls/mine` - authenticated creator dashboard
- `PATCH /gateway/polls/{code}/close` - creator only

### Voting/results

- `POST /gateway/polls/{code}/vote` - authenticated voter
- `GET /gateway/polls/{code}/results`

Use this header for protected endpoints:

```text
Authorization: Bearer <token>
```

## SignalR

For the first local version, Vue connects directly to VoteMana:

```text
https://localhost:7045/hubs/poll
```

After connecting, invoke:

```text
JoinPoll(code)
```

and listen for:

```text
PollResultsUpdated
```

The REST API still goes through Ocelot. Keeping the local SignalR connection direct avoids unnecessary gateway/WebSocket complexity while you are building the core coursework. It can later be placed behind the deployment reverse proxy if required.

## Short poll URL field

The ERD uses the field name `Url`. In this template, `Url` stores the generated short code (for example `7fGh2`), not the deployment domain. Vue can construct `/poll/7fGh2` from it. This keeps links portable between localhost and cloud deployment.

## Recommended next step

Create and apply the three initial migrations, then test in this order:

1. register/login;
2. create a poll with 2-6 options;
3. retrieve it using its short code;
4. vote once;
5. attempt a second vote with the same account and confirm it is rejected;
6. open the results page in another browser window and verify SignalR updates it;
7. close the poll and confirm further votes are rejected.
