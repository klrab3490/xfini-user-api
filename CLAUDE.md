# xfini-user-api

Standalone Express REST API for Xfini user creation, backed by Firebase Auth and Firestore.

## Stack

- **Runtime:** Node.js + Express
- **Auth/DB:** Firebase Admin SDK (Auth + Firestore)
- **Token auth:** Firebase Identity Toolkit REST API (signInWithPassword)

## Project Structure

```
index.js              # All routes and server logic (single-file)
serviceAccount.json   # Firebase service account key (gitignored)
.env                  # Admin credentials (gitignored)
.env.example          # Env var template
```

## Key Behaviours

- Admin token is cached in-memory for 55 minutes (Firebase tokens expire after 60)
- Every `POST /api/createUser` call re-authenticates internally using `.env` credentials and verifies the caller has `role: "admin"` in Firestore before proceeding
- `firstName`/`lastName` are auto-capitalised (proper case) server-side
- Custom claims (`role`, `assignedModules`, `assignedCourseIds`) are set on the Auth token after user creation; failure is non-fatal and logged as a warning

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/getToken` | Returns a fresh Firebase ID token for the `.env` admin account |
| POST | `/api/createUser` | Creates a Firebase Auth user + Firestore profile |

## Sensitive Files (never commit)

- `serviceAccount.json` — Firebase service account private key
- `.env` — admin email and password

## Dev Notes

- Default port: `3001`
- Start dev server: `npm run dev` (nodemon)
