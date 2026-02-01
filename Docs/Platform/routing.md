# Routing (React Router SPA)

Frontend is a **single-page app** with React Router. Public routes (signup, signin) and protected routes (app shell) are separate.

## Routes

| Path               | Access    | Description                   |
| ------------------ | --------- | ----------------------------- |
| `/`                | Public    | Redirect to signup or app     |
| `/signup`          | Public    | Sign-up flow (includes questionnaire: business name, slug) |
| `/signin`          | Public    | Login                         |
| `/login`           | Public    | Alias for signin              |
| `/` (app)          | Protected | App layout + outlet           |
| `/campaigns/email` | Protected | Email campaigns (etc.)        |

## Auth flow

- **AuthProvider** at root provides session and org. Protected routes use **AppLayout**: if not loading and no user → redirect to `/signin`; if user but no org → redirect to `/signup` (complete questionnaire there); if user + org → render outlet.
- All API calls use Supabase access token in `Authorization: Bearer <token>`.

## Status

Routing is implemented: `App.jsx` uses `BrowserRouter`, `Routes`, `AppLayout`; auth and no-org redirect to `/signup` are in place.
