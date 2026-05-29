# Sequoia OS — Web

> Next.js 15 + React 19 frontend for the Sequoia control plane. Browser, PWA,
> and Tauri desktop from a single codebase.
>
> Read **[FRONTEND.md](./FRONTEND.md)** first — it captures the aesthetic
> commitment, design system, and per-page concepts. This README is the
> developer-side quick-start.

## Quick start

```bash
pnpm install            # or npm/yarn/bun
cp .env.example .env
pnpm dev                # http://localhost:3000
```

The backend (Postgres, Redis, services) starts from the repo root:

```bash
cd .. && make docker-up   # see backend ARCHITECTURE.md
```

## Desktop (Tauri)

```bash
pnpm tauri dev      # opens a native window pointed at next dev
pnpm tauri build    # bundles dmg / msi / deb / AppImage
```

## Build matrix

| Target              | Command                                          |
|---------------------|--------------------------------------------------|
| Web (SSR + RSC)     | `pnpm build`                                     |
| Web (static export) | `SEQUOIA_DESKTOP=1 pnpm build`                   |
| Tauri desktop       | `pnpm tauri build` (invokes the above)           |
| Type-check          | `pnpm typecheck`                                 |
| Lint                | `pnpm lint`                                      |

## Pages

| Route                                 | What's here                                              |
|---------------------------------------|----------------------------------------------------------|
| `/dashboard`                          | Editorial hero + FleetMap + AI Copilot + activity feed   |
| `/devices`                            | Fleet list with sparklines + filter chips                |
| `/devices/[id]`                       | Live terminal · processes · plugins · identity           |
| `/ai`                                 | Agents grid + multi-agent timeline + memory              |
| `/workflows`                          | Definitions table + live runs                            |
| `/workflows/builder/[id]`             | Blueprint canvas builder                                 |
| `/notifications`                      | Inbox + channels + delivery stats                        |
| `/users`                              | RBAC + sessions + 2FA status                             |
| `/settings`                           | API keys + integrations + plugin registry                |
| `/login`                              | Editorial split-screen, passkey-first                    |

## License

Apache-2.0.
