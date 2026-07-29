# Authentication and authorization

Pinkora EduKonekta uses closed registration. There is no public registration endpoint. A school-issued invitation is redeemed once, only before its expiry, and its SHA-256 code hash is stored.

Passwords are stored as salted `scrypt` hashes. Sessions use cryptographically random opaque values in an HttpOnly, SameSite cookie; only the SHA-256 session hash is stored in PostgreSQL. Production cookies are Secure and sessions expire after seven days. Logout and deactivation revoke sessions.

Email verification and password recovery use one-time, expiring hashed tokens. Recovery requests return the same response for known and unknown email addresses. A delivery provider should be connected to send the raw token; this foundation never logs or returns it.

`AuthGuard` resolves the session, `RolesGuard` enforces role metadata, and `TenantGuard` rejects a requested `x-school-id` that differs from the authenticated tenant. Platform administrators may cross tenant boundaries for platform operations. Record-level rules belong in domain services and must check the authenticated user, tenant, and relationship (assigned class, linked child, or authorized guidance case) before querying or mutating data.

Login and recovery attempts are limited to five per identity per fifteen minutes per API process. Production deployments should replace this in-memory limiter with a shared Redis-backed limiter. Authentication successes, failures, logout, invitation redemption, recovery, password reset, and account status changes are written to `AuditLog`.

Roles are read from server-side memberships. Client-provided roles, school IDs, or status values are never trusted for authorization.
