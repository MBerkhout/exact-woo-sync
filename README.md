# Exact ↔ Woo middleware (Phase 3 — Exact connector)

Multi-tenant SaaS shell syncing **WooCommerce** ↔ **Exact Online** with strict tenant isolation (Supabase RLS), connector contracts, **Exact OAuth + webhooks (Phase 3)**, pgmq-backed queues, PII-safe logging, and onboarding.

## Docs

| File | Contents |
|------|----------|
| [docs/architecture.md](docs/architecture.md) | Stack, queue choice, versioning |
| [docs/schema.md](docs/schema.md) | Tables |
| [docs/connectors.md](docs/connectors.md) | Connector interface + registry |
| [docs/sync-semantics.md](docs/sync-semantics.md) | Loop prevention + idempotency notes |
| [docs/security.md](docs/security.md) | RLS + roles |
| [docs/retention.md](docs/retention.md) | Log TTL + purge |
| [docs/runbook.md](docs/runbook.md) | Dev / migrate / deploy |
| [docs/open-questions.md](docs/open-questions.md) | §11 PO items |

## Scripts

```bash
npm run dev
npm run build          # requires NEXT_PUBLIC_SUPABASE_* env — see docs/runbook.md
npm run test
npm run lint
npm run migrate:run
```

Copy [.env.example](.env.example) → `.env.local`.
