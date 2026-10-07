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
