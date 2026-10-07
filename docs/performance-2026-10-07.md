# Catalogue loading — 2026-10-07

Observed HTTPS origin from Android configuration: https://169-58-126-171.sslip.io.
One unauthenticated measurement from this Mac (not a general latency guarantee):
- `/`: HTTP 200, 0.36 s, 10,547 bytes.
- `/api/v1/state`: HTTP 200, first byte 0.56 s, total 9.43 s, 11,373,487 bytes.
- 53 inline image data URLs across 11 restaurants, 41 products and 2 departments.

Replacing the inline images with versioned media URLs in the captured payload reduces the serialized catalogue to approximately 32 KB. This estimate excludes images, which still download separately, can be cached, and are lazy-loaded by the existing web cards.

Local changes:
- Retain the pre-existing media route optimization; isolate and test catalogue image URL conversion. Uploaded originals are unchanged, image URLs change when content changes.
- Mount web application while the health check runs, allowing catalogue/session loading in parallel; preserve startup error/retry screen.
- Enable gzip for JSON, JavaScript, CSS and SVG in the production Nginx configuration.
- Mobile: parse JSON off the UI thread and remember image models instead of decoding base64 on every recomposition.

Deployment configuration:
- User confirmed this Contabo origin. iOS source updated to match Android.
- Visible startup feedback and first catalogue loading/error/retry state prevent showing an empty catalogue before the first response.
- Deployment and live measurements are recorded after validation.

Verified Contabo deployment (2026-10-07):
- Production image built on VPS; five focused tests passed against isolated MySQL (reviews ownership/status/concurrency/persistence, media URLs, patched Google HTTP client).
- Existing app replaced; production MySQL and its volume preserved. Previous image retained as `hadhri-delivery-app:before-20261007`.
- `/api/v1/state`: HTTP 200, 0.665 s, 32,121 decoded bytes, 4,883 transferred bytes with compression. Images excluded from these sizes/timing.
- Public counts preserved: 11 commerces, 41 products, 13 categories, 2 stored departments.
- Health, home, admin page and one versioned restaurant image returned HTTP 200. Browser confirmed visible loading then restaurant list.
- Temporary isolated MySQL container/network removed after successful tests.
- Render dashboard requires sign-in; its old service was not deleted. Web API uses same-origin Contabo and iOS source now targets Contabo. Mobile binaries must be rebuilt/reinstalled for source changes.
