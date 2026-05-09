# xfini-user-api

Standalone REST API for Xfini student creation, called from n8n. Backed by Firebase Auth and Firestore.

## Prerequisites

- Node.js 18+
- A Firebase project with **Authentication** and **Firestore** enabled
- A service account JSON key from the Firebase console

## Setup

```bash
npm install
```

Place your Firebase service account key at the project root:

```text
serviceAccount.json
```

Create a `.env` file:

```env
PORT=3001
```

## Running

```bash
# production
npm start

# development (auto-restart)
npm run dev
```

Server starts on `http://localhost:3001` by default.

## Docker

```bash
# Build
docker build -t xfini-user-api .

# Run
docker run -p 3001:3001 xfini-user-api
```

---

## API Endpoints

### `GET /health`

Health check.

**Response `200`**

```json
{ "status": "ok" }
```

---

### `POST /create-student`

Creates a new Firebase Auth user, resolves the subscription plan and active courses from Firestore automatically, and writes the full student profile.

#### Request body

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "student",
  "planmonths": "16 DAYS PLAN"
}
```

| Field        | Type   | Notes                                                                    |
| ------------ | ------ | ------------------------------------------------------------------------ |
| `firstName`  | string | Auto-capitalised                                                         |
| `lastName`   | string | Auto-capitalised                                                         |
| `email`      | string | Must be a valid email                                                    |
| `password`   | string | Minimum 6 characters                                                     |
| `role`       | string | `"student"` or `"admin"`                                                 |
| `planmonths` | string | Matched against `name` field in `subscriptionPlans` Firestore collection |

#### Response `200`

```json
{
  "success": true,
  "userId": "abc123",
  "email": "jane@example.com",
  "displayName": "Jane Doe",
  "password": "secret123",
  "role": "student",
  "planName": "16 DAYS PLAN",
  "planId": "plan-doc-id",
  "subscriptionId": "sub-doc-id",
  "assignedCourses": 4,
  "endDate": "2026-06-09T10:00:00.000Z"
}
```

#### Error responses

| Status | Code              | Reason                                                          |
| ------ | ----------------- | --------------------------------------------------------------- |
| `400`  | `INVALID_INPUT`   | Missing fields, invalid role, short password, bad planmonths    |
| `400`  | `PLAN_NOT_FOUND`  | No active plan matches the given `planmonths` name              |
| `400`  | `AUTH_FAILED`     | Email already in use or invalid                                 |
| `500`  | `FIRESTORE_FAILED`| Firestore write failed (Auth user is cleaned up automatically)  |

---

## Firestore Write Order

1. Query `subscriptionPlans` — find plan by `name == planmonths && isActive == true`
2. Query `courses` — collect all IDs where `isPublished == true`
3. Create Firebase Auth user
4. `users/{uid}` — `.set()` with profile and `deviceRestriction`
5. `subscriptions/{auto-id}` — `.add()` with full subscription payload
6. `users/{uid}` — `.update()` to populate `assignedCourseIds`
7. `setCustomUserClaims` — sets `role` and `assignedCourseIds` (non-fatal)

## Firestore: users/{uid}

```json
{
  "email": "jane@example.com",
  "displayName": "Jane Doe",
  "role": "student",
  "assignedModules": [],
  "assignedCourseIds": ["course1", "course2"],
  "deviceRestriction": {
    "enabled": true,
    "registeredDeviceId": null,
    "registeredAt": null
  },
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

## Environment Variables

| Variable | Description                       |
| -------- | --------------------------------- |
| `PORT`   | Port to listen on (default: 3001) |

## Notes

- n8n timeout should be set to at least **20,000ms** — endpoint makes 7 sequential Firebase calls (~4s typical)
- `EXCLUDED_COURSE_IDS` in `index.js` filters out test courses from being assigned — remove once test data is deleted from Firestore
