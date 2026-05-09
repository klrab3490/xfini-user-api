# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Standalone Express REST API for Xfini student creation, called from n8n. Backed by Firebase Auth and Firestore.

## Stack

- **Runtime:** Node.js + Express
- **Auth/DB:** Firebase Admin SDK (Auth + Firestore)

## Commands

```bash
npm run dev      # start with nodemon (auto-restart on change)
npm start        # production start
```

No test suite exists. Manual testing via curl or Postman against `http://localhost:3001`.

## Project Structure

```text
index.js              # All routes and server logic (single-file)
serviceAccount.json   # Firebase service account key (gitignored)
.env                  # Environment variables (gitignored)
.env.example          # Env var template
Dockerfile            # Docker build (copies serviceAccount.json at build time)
```

## Key Behaviours

- `firstName`/`lastName` are auto-capitalised (proper case) server-side
- Plan details (`planId`, `planName`, `price`) are resolved automatically from Firestore `subscriptionPlans` collection by matching `name == planmonths && isActive == true` — the caller does not supply these
- Active course IDs are fetched automatically from Firestore `courses` collection where `isPublished == true`
- `EXCLUDED_COURSE_IDS` at the top of `index.js` filters out test courses from being assigned to new students
- Custom claims (`role`, `assignedCourseIds`) are set on the Auth token after user creation; failure is non-fatal and logged as a warning
- If any Firestore write fails after the Auth user is created, the Auth user is deleted to prevent orphaned accounts
- `deviceRestriction` is written to `users/{uid}` with `enabled: true` by default

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/create-student` | Create a Firebase Auth user + Firestore profile + subscription |

### `POST /create-student` — required body fields

| Field | Type | Notes |
| --- | --- | --- |
| `firstName` | string | Auto-capitalised |
| `lastName` | string | Auto-capitalised |
| `email` | string | |
| `password` | string | Min 6 chars |
| `role` | string | `"student"` or `"admin"` |
| `planmonths` | string | Matched against `name` field in `subscriptionPlans` collection |

### `POST /create-student` — Firestore write order

1. Query `subscriptionPlans` — resolve plan by `name == planmonths && isActive == true`
2. Query `courses` — collect all IDs where `isPublished == true`, exclude `EXCLUDED_COURSE_IDS`
3. Firebase Auth `createUser`
4. `users/{uid}` — `.set()` with empty `assignedCourseIds: []` and `deviceRestriction`
5. `subscriptions/{auto-id}` — `.add()` with full subscription payload; `endDate` calculated via `setMonth(+months)`
6. `users/{uid}` — `.update()` to populate `assignedCourseIds`
7. `setCustomUserClaims` — sets `role` and `assignedCourseIds` (non-fatal)

### `POST /create-student` — success response

```json
{
  "success": true,
  "userId": "uid",
  "email": "...",
  "displayName": "First Last",
  "password": "plain-text",
  "role": "student",
  "planName": "...",
  "planId": "...",
  "subscriptionId": "auto-id",
  "assignedCourses": 4,
  "endDate": "2026-11-09T..."
}
```

## Sensitive Files (never commit)

- `serviceAccount.json` — Firebase service account private key
- `.env` — environment credentials

## Dev Notes

- Default port: `3001` (override with `PORT` env var)
- n8n timeout should be set to at least 20,000ms — endpoint makes 7 sequential Firebase calls (~4s typical)
- The Dockerfile bakes in `serviceAccount.json` at build time — update when deploying to a new environment
- `EXCLUDED_COURSE_IDS` in `index.js` — remove once test courses are deleted from Firestore
