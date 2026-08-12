# Backend OAuth & Token Differences

Two Google OAuth flows in the backend, used for different purposes. They share the same `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` but request different scopes and store different tokens.

## 1. App Login (normal users)

| Item | Detail |
|---|---|
| Flow | `/api/auth/google` → `/api/auth/google/callback` |
| File | `src/auth/auth.controller.ts`, `src/auth/auth.service.ts` |
| Scopes | `openid email profile` |
| Purpose | Verify identity, let user into the app |
| `access_type` | none (`online`) — Google refresh token **not** issued/discarded |
| Token stored | **App JWT refresh token** (signed with `JWT_SECRET`) |
| Storage | httpOnly cookie (`REFRESH_TOKEN_COOKIE`) |
| Lifespan | Until logout / expiry; no Gmail access |
| Re-login | `POST /auth/refresh` mints new access token from the JWT |

Key code: `auth.service.ts:45` — `jwtService.signAsync({ sub: user.id, type: 'refresh' })`.

## 2. Mailbox Tracking (admin setup)

| Item | Detail |
|---|---|
| Flow | `/api/gmail/connect` → `/api/gmail/callback` |
| File | `src/ingestion/gmail-auth.provider.ts`, `gmail-connect.service.ts` |
| Scopes | `https://www.googleapis.com/auth/gmail.readonly` |
| Purpose | Read a specific Gmail mailbox on the server (watch → Pub/Sub → parse) |
| `access_type` | `offline` + `prompt=consent` → Google **always** issues a refresh token |
| Token stored | **Google OAuth refresh token** (`GmailAccount.refreshToken`) |
| Storage | Postgres, per mailbox, masked in API responses |
| Lifespan | Forever unless user revokes; access token (~1h) auto-refreshed by googleapis |
| Restriction | `GOOGLE_ALLOWED_EMAIL` in `.env` — only that mailbox can be connected |

Key code: `gmail-auth.provider.ts:29` — `access_type: 'offline', prompt: 'consent'`.

## Comparison

| | App login | Mailbox tracking |
|---|---|---|
| OAuth grant | Authorization code (online) | Authorization code (offline) |
| Google refresh token | Not stored | Stored in `GmailAccount` |
| Token used ongoing | App JWT | Google refresh token |
| Access to | User session | Full Gmail read access |
| Env control | none | `GOOGLE_ALLOWED_EMAIL` |

## Related env vars

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/gmail/callback   # mailbox flow
GOOGLE_ALLOWED_EMAIL=nquocnhu95it@gmail.com                     # mailbox allowlist
GOOGLE_PUBSUB_TOPIC=...
GOOGLE_PUBSUB_SUBSCRIPTION=...
GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
```

Note: `BASE_URL` controls the app-login redirect URI (`/api/auth/google/callback`); `GOOGLE_REDIRECT_URI` controls the mailbox callback (`/api/gmail/callback`).
