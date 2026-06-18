---
title: Core concepts
description: The mental model behind Gears — gears, the SDK pattern, ClientHub, and the security model.
sidebar:
  label: Core concepts
  order: 1
---

This page is the mental model you need before building. Each concept links to deeper
material in [Architecture](/architecture/).

## The three-tier gear hierarchy

Gears are organized into exactly three tiers, with a one-way dependency direction:

```text
Service gears   (gears/)          business capabilities
      │  depend on
      ▼
System gears    (gears/system/)   control plane: gateway, authn/authz, tenancy, …
      │  depend on
      ▼
Toolkit         (libs/)           runtime substrate: REST, DB, security, observability
```

- **Toolkit** (`libs/`) — the low-level substrate: API middleware, DB access, error
  definitions, transport, security primitives, observability, and macros.
- **System gears** (`gears/system/`) — the control plane: API gateway, authn/authz
  resolvers, tenant resolver, resource groups, type registry, and other cross-cutting
  services. They are ordinary gears, so they can be replaced.
- **Service gears** (`gears/`) — your business capabilities, built on the platform.

Adding a gear does not require editing a central switchboard — dependency ordering is a
platform guarantee, not an application convention.

## The SDK pattern: facade + backend trait

Every gear's public API lives in a dedicated **SDK crate** (`<gear>-sdk`) that contains
only the interface: a transport-agnostic trait, models, and error types. The
implementation depends on the SDK, never the other way around.

```rust
// users-info-sdk/src/client.rs — the public facade trait (abridged)
#[async_trait]
pub trait UsersInfoClientV1: Send + Sync {
    async fn get_user(&self, ctx: SecurityContext, id: Uuid) -> Result<User, UsersInfoError>;
    async fn create_user(&self, ctx: SecurityContext, new_user: NewUser) -> Result<User, UsersInfoError>;
    async fn delete_user(&self, ctx: SecurityContext, id: Uuid) -> Result<(), UsersInfoError>;
    // …additional methods omitted (the real trait also exposes streaming sub-clients)
}
```

The same trait can have multiple **backends**:

- an **in-process adapter** that calls the gear's domain service directly, or
- a **gRPC client** that talks to the gear running in another process.

Consumers call the trait and never know which backend they got. The first parameter of
every method is a `SecurityContext` — identity and tenancy flow as explicit data, not
thread-local magic.

## ClientHub: how gears find each other

Gears resolve each other's SDK traits through the typed **ClientHub**. A gear registers
its implementation during `init`, and consumers look it up by trait:

```rust
// Provider side — register the local adapter under the SDK trait
ctx.client_hub().register::<dyn UsersInfoClientV1>(Arc::new(local_client));

// Consumer side — resolve and call it
let users = ctx.client_hub().get::<dyn UsersInfoClientV1>()?;
let user = users.get_user(ctx, id).await?;
```

Whether the registered implementation is a local adapter (single process) or a gRPC
client (out-of-process) is decided by configuration — the calling code is identical.

## Capabilities and the runtime lifecycle

A gear declares what it needs and what it exposes as **capabilities** — `db`, `rest`,
`grpc`, `stateful` — in its `#[toolkit::gear(...)]` attribute. The runtime discovers all
gears at link time, builds a dependency-ordered registry, and drives them through a
shared lifecycle: `pre_init` → DB migration → `init` → `post_init` (a barrier) → REST
wiring → gRPC wiring → `start` / `stop`. Shutdown runs in reverse dependency order with
cancellation tokens, so background work cooperates with shutdown.

See [Runtime architecture](/architecture/) for the full phase list.

## Secure-by-default: the data path

Security is enforced as a layered path you cannot accidentally bypass:

1. **Static checks** — custom lints catch violations at build time (e.g. raw SQL outside
   migrations, domain importing infra).
2. **Authentication** — the API Gateway validates tokens and injects a `SecurityContext`.
   Gears never parse tokens.
3. **Authorization** — handlers call the `PolicyEnforcer` (PEP), which queries the AuthZ
   resolver (PDP). The decision includes row-level constraints compiled into an `AccessScope`.
4. **Database scoping** — gears query through `SecureConn`, which applies the `AccessScope`
   as automatic `WHERE` clauses for tenant isolation and ABAC. Raw connections are not exposed.

Entities opt into scoping with `#[derive(Scopable)]`, declaring which columns map to the
tenant / owner / resource / type dimensions.

:::danger[Never bypass SecureConn]
Reaching for a raw database connection skips `AccessScope` and can leak data across
tenants. There is intentionally no unscoped escape hatch — raw SQL outside migrations is
rejected by the workspace lints. Always go through `SecureConn` with a scope obtained from
the `PolicyEnforcer`.
:::

## Errors: one canonical model

All errors use a single canonical taxonomy of **16 categories** (aligned with gRPC status
codes), each with a fixed HTTP mapping and a stable type identity. At the REST boundary
they render as **RFC-9457** problem documents (`application/problem+json`), so clients get
consistent, machine-readable errors across every gear.

## Multi-tenancy

Tenants form a **single-root tree**. Every resource belongs to exactly one tenant
(`owner_tenant_id`), which is the primary isolation boundary. Parents can see child data by
default; a child can raise a **barrier** (`self_managed = true`) to hide its subtree from
ancestors. **Resource groups** add optional, tenant-scoped grouping for finer access control.

## Where to go next

- [Build your first gear](/get-started/your-first-gear/) — apply all of the above.
- [Components & features](/reference/) — what the toolkit and system gears give you.
- [Architecture](/architecture/) — the same concepts, in depth.
