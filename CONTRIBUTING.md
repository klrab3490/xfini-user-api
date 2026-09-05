# Contributing

Thanks for considering a contribution to xfini-user-api.

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in your Firebase values
pnpm run dev
```

## Before opening a PR

- Run `pnpm test` — the suite mocks `firebase-admin`, no real Firebase project needed.
- Run `pnpm run lint` and `pnpm run format`.
- Keep changes scoped; unrelated refactors belong in a separate PR.

## Reporting bugs / requesting features

Open a GitHub issue using the provided templates. Include steps to reproduce
for bugs, and the use case for feature requests.

## Security issues

Do not open a public issue for vulnerabilities — see [SECURITY.md](SECURITY.md).
