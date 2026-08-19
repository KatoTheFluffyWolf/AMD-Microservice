# Poll Builder integration setup

The source code is aligned around this request flow:

```text
Vue -> Ocelot ApiGateway -> PollMana / VoteMana -> Neon PostgreSQL
Vue <--------------------- VoteMana SignalR
```

Creator-only requests carry a bearer token issued by AuthMana. Voting and public results are anonymous.
Duplicate voting is enforced in Neon with a unique `(PollID, VoterToken)` index.

## 1. Frontend configuration

From `frontend`, copy `.env.example` to `.env.local` and set the gateway and SignalR URLs.

```text
VITE_API_BASE_URL=https://apigateway-14el.onrender.com/gateway
VITE_SIGNALR_HUB_URL=https://votemana.onrender.com/hubs/poll
```

For local development, use `https://localhost:5000/gateway` and
`https://localhost:7045/hubs/poll` instead.

## 2. Render environment variables

### ApiGateway

```text
FrontendUrls=http://localhost:5173;https://YOUR_FRONTEND.vercel.app
```

### PollMana

```text
ConnectionStrings__myContext=YOUR_NEON_CONNECTION_STRING
Jwt__Key=THE_SAME_LONG_RANDOM_KEY_USED_BY_AUTHMANA
Jwt__Issuer=PollBuilder
Jwt__Audience=PollBuilderClient
FrontendUrls=http://localhost:5173;https://YOUR_FRONTEND.vercel.app
```

### AuthMana

```text
ConnectionStrings__myContext=YOUR_NEON_CONNECTION_STRING
Jwt__Key=THE_SAME_LONG_RANDOM_KEY_USED_BY_POLLMANA
Jwt__Issuer=PollBuilder
Jwt__Audience=PollBuilderClient
FrontendUrls=http://localhost:5173;https://YOUR_FRONTEND.vercel.app
```

### VoteMana

```text
ConnectionStrings__myContext=YOUR_NEON_CONNECTION_STRING
ServiceEndpoints__ApiGatewayBaseUrl=https://apigateway-14el.onrender.com/
FrontendUrls=http://localhost:5173;https://YOUR_FRONTEND.vercel.app
```

## 3. Apply the integration migrations

Before running the commands locally, make the shared JWT settings available to the .NET
processes. In PowerShell:

```powershell
$env:Jwt__Key="use-a-long-random-development-secret-at-least-32-characters"
$env:Jwt__Issuer="PollBuilder"
$env:Jwt__Audience="PollBuilderClient"
```

From `AMD-Microservice-main`, apply migrations in this order:

```sh
dotnet ef database update --project AuthMana --startup-project AuthMana --context AuthContext
dotnet ef database update --project PollMana --startup-project PollMana --context PollContext
dotnet ef database update --project VoteMana --startup-project VoteMana --context VoteContext
```

The PollMana migration removes the old creator foreign key to `AspNetUsers`, allowing the
AuthMana `sub` claim to be stored as the owner. The VoteMana migration changes `UserID` to
`VoterToken` and preserves database-level duplicate-vote enforcement.

## 4. End-to-end verification

1. Start AuthMana, the other backend services, and Vue; register and sign in through the local AuthMana flow.
2. Create a poll; the browser should navigate to `/poll/{code}/manage`.
3. Open `/poll/{code}` in a private window and vote without signing in.
4. Keep `/poll/{code}/results` open in another window and confirm its chart updates immediately.
5. Try voting again from the same private window and confirm the API returns `409`.
6. Close the poll from the creator view and confirm later votes return `410`.
7. Register a different user and confirm closing the first user’s poll returns `403`.

Render free services can take time to wake up on the first request. Retry after all three backend
services report a successful deployment.
