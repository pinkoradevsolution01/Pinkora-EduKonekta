# Foundation architecture

## Boundaries

- `apps/web` is the stateless Next.js presentation and PWA shell.
- `apps/api` is a NestJS modular monolith. Each future domain module should own its controller, application services, persistence adapter, events, and tests under `src/modules/<module>`.
- `packages/shared` contains transport contracts and primitives that can be shared without coupling frontend and backend implementations.

## Multi-tenancy

Every tenant-scoped table must carry `school_id` (represented as `schoolId` in Prisma naming where appropriate). Tenant context must be resolved at the API boundary and passed explicitly into application services and repositories. Repository queries must never rely on an implicit global tenant.

## Events and jobs

The initial foundation leaves business event handlers and workers out of scope. Shared `DomainEvent`, `NotificationJob`, `EventPublisher`, and `JobDispatcher` contracts live in `packages/shared`. Future implementations should use an outbox-backed publisher and independently deployable worker process. This preserves a path from the modular monolith to services without changing domain boundaries.

## Operational conventions

- Versioned routes use `/api/v1/...`.
- `GET /api/v1/health` reports API and PostgreSQL reachability.
- Errors are normalized by the global HTTP exception filter and include a request ID.
- Logs are JSON structured logs emitted by the API logger.
- Stateless application containers keep durable state in PostgreSQL or future managed infrastructure.
