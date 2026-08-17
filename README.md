# Poll Builder Coursework Backend

This solution adapts the supplied classroom microservice template to the Poll & Survey Builder coursework.

## Projects

- **ApiGateway** - Ocelot API gateway. Vue should send normal REST requests here.
- **AuthMana** - preserved classroom Identity service. The current Vue application uses Auth0
  instead, so this service is not used by its sign-in flow.
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

- An Auth0 subject may create many polls.
- One poll has 2-6 options.
- A poll option belongs to one poll.
- A browser voter token may vote only once per poll (`PollID + VoterToken` is unique).
- `PollID + PollOptionID` is also validated so a vote cannot select an option belonging to another poll.

PollMana and VoteMana use the same Neon PostgreSQL database to match the classroom template and
the coursework ERD. This is a shared-database microservice-style coursework architecture, not
strict database-per-service microservices.

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

## 2. Configure Auth0 validation

Set these environment variables on PollMana. They must match the Auth0 API used by Vue:

```text
Authentication__Authority=https://YOUR_AUTH0_DOMAIN/
Authentication__Audience=https://poll-builder-api
```

Set `FrontendUrls` on ApiGateway, PollMana, and VoteMana to a semicolon-separated list containing
the local and deployed Vue origins, for example
`http://localhost:5173;https://YOUR_FRONTEND.vercel.app`.

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

Start PollMana, VoteMana and ApiGateway. AuthMana is only needed if the team still wants to
demonstrate the legacy classroom registration API:

```bash
dotnet run --project PollMana
dotnet run --project VoteMana
dotnet run --project ApiGateway
```

REST requests from Vue should go through:

```text
https://apigateway-14el.onrender.com/gateway/...
```

## API through the gateway

### Legacy AuthMana endpoints (not used by the Vue/Auth0 flow)

- `POST /gateway/auth/register`
- `POST /gateway/auth/login`
- `GET /gateway/auth/me`

### Polls

- `POST /gateway/polls` - authenticated creator
- `GET /gateway/polls/{code}` - load poll
- `GET /gateway/polls/mine` - authenticated creator dashboard
- `PATCH /gateway/polls/{code}/close` - creator only

### Voting/results

- `POST /gateway/polls/{code}/vote` - public; body contains `optionIndex` and `voterToken`
- `GET /gateway/polls/{code}/results`

Use this header for creator-only endpoints (`POST /polls`, `GET /mine`, and `PATCH /close`):

```text
Authorization: Bearer <token>
```

## SignalR

Vue connects directly to the deployed VoteMana hub:

```text
https://votemana.onrender.com/hubs/poll
```

After connecting, invoke:

```text
JoinPollGroup(code)
```

and listen for:

```text
ResultsUpdated
```

The REST API still goes through Ocelot. Keeping the local SignalR connection direct avoids unnecessary gateway/WebSocket complexity while you are building the core coursework. It can later be placed behind the deployment reverse proxy if required.

## Short poll URL field

The ERD uses the field name `Url`. In this template, `Url` stores the generated short code (for example `7fGh2`), not the deployment domain. Vue can construct `/poll/7fGh2` from it. This keeps links portable between localhost and cloud deployment.

## Recommended next step

Create and apply the three initial migrations, then test in this order:

1. sign in through Auth0;
2. create a poll with 2-6 options;
3. retrieve it using its short code in a private/public browser window;
4. vote once without signing in;
5. attempt a second vote with the same browser token and confirm it is rejected;
6. open the results page in another browser window and verify SignalR updates it;
7. close the poll as its Auth0 creator and confirm further votes are rejected.
