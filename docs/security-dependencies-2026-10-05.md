# Dependency security remediation — 2026-10-05

Follow-up verification: 2026-10-06.

## Changes

- Next.js and eslint-config-next: minimum 16.3.8; lockfile refreshed without `--force` or downgrading Firebase.
- Firebase Firestore's pinned gRPC dependency: override to 1.14.5 (same major, patched certificate handling).
- Satori's pinned fflate: override to 0.7.5 (patched ZIP64 parsing).
- gaxios 6.7.1: override uuid to 11.1.1. This version retains CommonJS and the `v4()` API used by gaxios. A local HTTP multipart integration test covers that usage.
- Backend Docker image installs production dependencies only, like the Contabo image already does. Both runtime images remove npm/npx after installation because startup invokes Node directly. This removes vulnerable unused npm internals identified by Trivy.
- Explicit TypeScript extension for the Sites plugin import removes the Vite native-loader warning.

- Follow-up: source-map-js updated from 1.2.1 to 1.2.2 for GHSA-68fv-2mgg-jv7q.

- Bundle Plus Jakarta Sans and Fraunces locally with their OFL licenses. The clean Docker build exposed a next/font/google URL parsing failure; local fonts eliminate that network dependency while retaining the font families.

## Audit results

Initial full audit: 36 findings (3 critical, 20 high, 13 moderate).
Final full audit: 12 findings (0 critical, 8 high, 4 moderate).
Production-only audit: **0 findings**.

Counts include dependency chains; eight high findings are propagated from `braces`.

Remaining development-only roots:

- `braces <=3.0.3`: GHSA-vfj7-8cjw-p6xm. npm's latest published version at verification was 3.0.3, with no patched release. Reaches eslint-config-next and vinext through globbing dependencies.
- `esbuild <=0.24.2`: GHSA-67mh-4wv8-2f99, through drizzle-kit / @esbuild-kit. Its dependency constrains esbuild to ~0.18.20. A forced cross-version override or suggested drizzle-kit downgrade has not been applied without a migration validation.

The GitHub audit gate remains unchanged and will still fail on the unresolved high development finding. No exclusions or severity threshold changes were introduced.

## Validation

- 57 tests passed using a separate temporary MySQL 8.4 container, including multipart compatibility, customer isolation and order status updates.
- ESLint: zero errors; six existing unused-parameter warnings.
- Both vinext and Next.js static export builds passed during remediation; Docker builds and scans are also validated below.
- Backend Docker build passed on 2026-10-06. Trivy HIGH/CRITICAL scan: zero findings after removing the unused bundled npm from the runtime.
- Backend container health returned HTTP 200 with MySQL persistence enabled.
- Complete Contabo Docker build passed. Trivy HIGH/CRITICAL scan: zero findings (Alpine and Node packages).
- Complete container: `/`, `/admin`, `/api/v1/health` and `/api/v1/state` returned HTTP 200; unauthenticated `/api/v1/admin/state` returned HTTP 401. A temporary backup-encryption key and isolated MySQL database were used.
- Final vinext build and all 57 tests passed on 2026-10-06.
- No Contabo configuration or production data modified; changes remain local.

References:
- https://github.com/advisories/GHSA-vcvr-r3jv-pc5j
- https://github.com/advisories/GHSA-m9gg-hp2v-232j
- https://github.com/advisories/GHSA-px8p-9vwx-vf98
- https://github.com/advisories/GHSA-w5hq-g745-h8pq
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-67mh-4wv8-2f99
