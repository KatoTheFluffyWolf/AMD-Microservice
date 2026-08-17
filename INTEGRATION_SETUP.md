# Poll Builder integration setup

The source code is aligned around this request flow:

```text
Vue -> Ocelot ApiGateway -> PollMana / VoteMana -> Neon PostgreSQL
Vue <--------------------- VoteMana SignalR
```

Creator-only requests carry an Auth0 bearer token. Voting and public results are anonymous.
Duplicate voting is enforced in Neon with a unique `(PollID, VoterToken)` index.

## 1. Frontend configuration

From `frontend`, copy `.env.example` to `.env.local` and replace the two Auth0 placeholders:

```text
VITE_API_BASE_URL=https://apigateway-14el.onrender.com/gateway
VITE_SIGNALR_HUB_URL=https://votemana.onrender.com/hubs/poll
VITE_AUTH0_DOMAIN=YOUR_AUTH0_DOMAIN
VITE_AUTH0_CLIENT_ID=YOUR_AUTH0_SPA_CLIENT_ID
VITE_AUTH0_AUDIENCE=https://poll-builder-api
```

In the Auth0 SPA application, allow both `http://localhost:5173` and the final Vercel origin in
Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins.

## 2. Render environment variables

### ApiGateway

```text
FrontendUrls=http://localhost:5173;https://YOUR_FRONTEND.vercel.app
```

### PollMana

```text
ConnectionStrings__myContext=YOUR_NEON_CONNECTION_STRING
Authentication__Authority=https://YOUR_AUTH0_DOMAIN/
Authentication__Audience=https://poll-builder-api
FrontendUrls=http://localhost:5173;https://YOUR_FRONTEND.vercel.app
```

### VoteMana

```text
ConnectionStrings__myContext=YOUR_NEON_CONNECTION_STRING
ServiceEndpoints__ApiGatewayBaseUrl=https://apigateway-14el.onrender.com/
FrontendUrls=http://localhost:5173;https://YOUR_FRONTEND.vercel.app
```

AuthMana is preserved in the repository but is not used by the Vue/Auth0 flow.

## 3. Apply the integration migrations

Before running the commands locally, make the PollMana Auth0 settings available to the .NET
process. In PowerShell:

```powershell
$env:Authentication__Authority="https://YOUR_AUTH0_DOMAIN/"
$env:Authentication__Audience="https://poll-builder-api"
```

From `AMD-Microservice-main`, apply migrations in this order:

```sh
dotnet ef database update --project AuthMana --startup-project AuthMana --context AuthContext
dotnet ef database update --project PollMana --startup-project PollMana --context PollContext
dotnet ef database update --project VoteMana --startup-project VoteMana --context VoteContext
```

The new PollMana migration removes the old creator foreign key to `AspNetUsers`, allowing the
Auth0 `sub` claim to be stored as the owner. The new VoteMana migration changes `UserID` to
`VoterToken` and preserves database-level duplicate-vote enforcement.

## 4. End-to-end verification

1. Start Vue and sign in through Auth0.
2. Create a poll; the browser should navigate to `/poll/{code}/manage`.
3. Open `/poll/{code}` in a private window and vote without signing in.
4. Keep `/poll/{code}/results` open in another window and confirm its chart updates immediately.
5. Try voting again from the same private window and confirm the API returns `409`.
6. Close the poll from the creator view and confirm later votes return `410`.
7. Sign in as a different Auth0 user and confirm closing the poll returns `403`.

Render free services can take time to wake up on the first request. Retry after all three backend
services report a successful deployment.
