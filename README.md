# xfini-user-api

Standalone REST API for Xfini user creation and management, backed by Firebase Auth and Firestore.

## Prerequisites

- Node.js 18+
- A Firebase project with **Authentication** and **Firestore** enabled
- A service account JSON key from the Firebase console

## Setup

```bash
npm install
```

Place your Firebase service account key at the project root:

```
serviceAccount.json
```

Create a `.env` file:

```env
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-admin-password
PORT=3001
```

The `ADMIN_EMAIL` / `ADMIN_PASSWORD` must belong to a user whose Firestore `users/{uid}` document has `role: "admin"`.

## Running

```bash
# production
npm start

# development (auto-restart)
npm run dev
```

Server starts on `http://localhost:3001` by default.

## Docker

`serviceAccount.json` and `.env` are excluded from the image and must be mounted at runtime.

```bash
# Build
docker build -t xfini-user-api .

# Run
docker run -p 3001:3001 \
  --env-file .env \
  -v $(pwd)/serviceAccount.json:/app/serviceAccount.json:ro \
  xfini-user-api
```

---

## API Endpoints

### `POST /api/getToken`

Returns a fresh Firebase ID token for the admin account configured in `.env`. Useful for debugging or manual testing.

**Request:** no body required.

**Response `200`**
```json
{
  "success": true,
  "idToken": "<firebase-id-token>",
  "expiresIn": "3600"
}
```

**Response `401`**
```json
{ "success": false, "error": "INVALID_PASSWORD" }
```

---

### `POST /api/createUser`

Creates a new Firebase Auth user and writes their profile to Firestore. Requires the `.env` admin credentials to have the `admin` role.

**Request body**
```json
{
  "email": "jane@example.com",
  "password": "secret123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "student"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | yes | Must be a valid email |
| `password` | string | yes | Minimum 6 characters |
| `firstName` | string | yes | Auto-capitalised |
| `lastName` | string | yes | Auto-capitalised |
| `role` | string | yes | `"admin"` or `"student"` |

**Response `201`**
```json
{
  "success": true,
  "message": "User created successfully.",
  "user": {
    "uid": "abc123",
    "email": "jane@example.com",
    "displayName": "Jane Doe",
    "role": "student"
  }
}
```

**Error responses**

| Status | Reason |
|--------|--------|
| `400` | Missing fields, invalid email, or weak password |
| `401` | Admin credentials in `.env` are invalid |
| `403` | `.env` account exists but is not an admin |
| `409` | Email already in use |
| `500` | Server or Firebase error |

---

## Firestore User Document

Each created user gets a document at `users/{uid}`:

```json
{
  "email": "jane@example.com",
  "displayName": "Jane Doe",
  "role": "student",
  "assignedModules": [],
  "assignedCourseIds": [],
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

Custom claims (`role`, `assignedModules`, `assignedCourseIds`) are also set on the Auth token.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | Email of an admin Firebase user |
| `ADMIN_PASSWORD` | Password for that admin user |
| `PORT` | Port to listen on (default: `3001`) |
