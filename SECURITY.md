# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

To report a vulnerability in `xfini-user-api`, please email **abrahul02@gmail.com** with the subject line `[SECURITY] xfini-user-api`.

Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept
- Affected version(s)

You can expect an initial response within **48 hours**. If the vulnerability is confirmed, a fix will be prioritised and you will be credited (unless you prefer otherwise). If it is declined, we will explain why.

**Please do not open a public GitHub issue for security vulnerabilities.**

## Sensitive Surface Areas

The following areas handle credentials or privileged data and are most security-sensitive:

- **`POST /api/getToken`** — signs in with admin Firebase credentials; the returned ID token grants admin-level access
- **`POST /create-student`** — creates Firebase Auth users and writes Firestore records; requires a valid token
- **`FIREBASE_CREDENTIALS` env var** — contains the full Firebase service account private key
- **`serviceAccount.json`** — must never be committed or included in Docker images pushed to public registries
