# LibreChat agent instructions

## Production Docker deployment authority — mandatory

Do not run this repository's Compose files against production. They are
historical source inputs even when their names look deployable. The canonical
LibreChat manifests and guarded workflow live in `C:\INTERSOFT\deploy`; bind
data lives in `C:\INTERSOFT\data\librechat`. Validate with
`C:\INTERSOFT\deploy\scripts\Deploy-Unit.ps1 -Unit librechat` and use `-Apply`
only with explicit authorization. Local development and tests remain allowed.

See CLAUDE.md.

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.
