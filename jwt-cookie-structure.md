# Backend JWT & Cookie Structure

## Token types

`auth.service.ts:40` — `issueTokens(user)` mints two JWTs on login:

### 1. Access token
```ts
this.jwtService.signAsync(user, {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
});
```
- Payload: the full `AuthenticatedUser` object — `id`, `email`, `roles`, `permissions`, ...
- Expiry: `JWT_EXPIRES_IN` (default `1d`)
- Stored in the **access cookie**

### 2. Refresh token
```ts
this.jwtService.signAsync({ sub: user.id, type: 'refresh' }, {
  secret: process.env.REFRESH_SECRET,
  expiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
});
```
- Payload: **only** `{ sub: user.id, type: 'refresh' }` — no role, no email
- Signed with a **separate secret** (`REFRESH_SECRET`, not `JWT_SECRET`)
- Expiry: `REFRESH_EXPIRES_IN` (default `7d`)
- Stored in the **refresh cookie**

## Cookies

`auth.controller.ts:25` — `setAuthCookies()` stores both tokens in httpOnly cookies:

| Cookie | Content (JWT payload) | Expiry | Purpose |
|---|---|---|---|
| access cookie | full user (id, email, roles, permissions) | 1d | authenticated API calls |
| refresh cookie | `{ sub, type: 'refresh' }` only | 7d | `POST /auth/refresh` |

- Cookie = carrier (name, path, httpOnly, expires...). Token/JWT = the content stored inside.
- Both cookies are `httpOnly` — JS cannot read them; sent automatically per request.

## Refresh flow

`POST /auth/refresh` (`auth.controller.ts:63`):
1. Reads refresh token from cookie
2. Verifies signature with `REFRESH_SECRET` and checks `payload.type === 'refresh'` (`auth.service.ts:265`)
3. Re-loads the user (roles/permissions) from DB by `sub`
4. Mints fresh access + refresh tokens

Because the refresh token carries only the user id, the backend always re-fetches current roles from the DB instead of trusting stale claims.

## Why two secrets

| Token | Secret | If leaked |
|---|---|---|
| access | `JWT_SECRET` | forge access tokens for any user |
| refresh | `REFRESH_SECRET` | forge refresh tokens / keep sessions alive |

Keep both in `.env`, never in code or VCS.
