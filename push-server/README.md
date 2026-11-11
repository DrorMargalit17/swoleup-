# SwoleUp personal push service

Free Workers plan only. SQLite-backed Durable Object migration is required. Do not select the paid Workers plan or add billing to deploy this service.

## Setup

1. Install locked dependencies with `npm ci`.
2. Provide a scoped Cloudflare API token and account ID only via private environment variables. Never commit credentials.
3. Generate an ECDSA P-256 VAPID key pair with Web Crypto. Export the uncompressed public key as base64url; export only the private JWK `d` as the private key. Keep this pair stable or existing browser subscriptions will need to be renewed.
4. Store `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` with Wrangler's encrypted secrets. Do not put private values in wrangler.jsonc or the app bundle.
5. `npm test`, `npm run check`, then deploy with `npm run deploy`.
6. Put the returned HTTPS Workers URL in `src/pushConfig.ts` and allow that exact host in the app CSP. Rebuild the app and deploy Pages.
7. In the installed PWA, Settings → enable notifications → test. A real iPhone delivery check is required; mocked browser tests don't prove APNs delivery.

## Data and security

- One SQLite-backed Durable Object holds at most16device schedules for this personal deployment.
- Each browser generates a random256-bit bearer capability. Only its SHA-256 digest is stored as a record ID. The original stays in localStorage, excluded from app exports and IndexedDB recovery.
- CORS is limited to the app origin. CORS is not authentication; the bearer capability protects each existing device record. New registrations are public, rate-limited globally to one/minute and bounded to16devices. Someone could fill the registration limit or consume free quota. For broader/public distribution add an enrollment gate or bot protection before lifting these personal limits.
- Subscription endpoints are restricted to known HTTPS browser push-service hosts; redirects are forbidden, and recipient encryption keys are validated. There is no arbitrary-message send endpoint.
- Uploaded fields: subscription endpoint/keys, timezone, up to3preferred times, completed-today date, active flag, rest deadline and a monotonic revision. No AI key, profile, exercise details or chats.
- Older revisions cannot overwrite newer state. Tests are limited to one/minute/device. Maximum request body8192bytes. No console logging or request observability is enabled.
- Stale device data expires after30days; active-workout suppression expires after6hours without another sync. Disable deletes that device's schedule before reporting success. A failed offline disable does not pretend it succeeded.

## Timing and reliability

- Daily times follow the last-synced device timezone, including DST; nonexistent DST clock times are skipped rather than moved to another hour.
- Daily reminders are skipped if the latest synced state says a workout is active or completed today.
- Rest push is scheduled when the document becomes hidden, and cancelled on return, skip, adjust, pause, finish or exit. Background JS is not needed for the server alarm once the deadline has synced.
- If iOS freezes the page before the visibility update reaches the service, the server cannot schedule/cancel it. Offline state changes cannot suppress a previously scheduled reminder. Never claim strict delivery/suppression for state the server hasn't received.
- Push uses short TTL:45s rest,120s workout. Late alarms are discarded (rest60s, daily5min). Focus/network/OS can delay or suppress delivery. This is not an alarm-clock replacement.
- Due state is removed before transmitting to avoid repeated alarms. A transport failure may lose this reminder; it is not repeatedly resent. Every received push is displayed as a notification, as iOS requires. No silent push is used to query app state.

## License

Web Push encryption uses @block65/webcrypto-web-push2.0.0, MIT. Its copyright/license is included in THIRD-PARTY-LICENSES.txt. Other package licenses remain in their package distributions. Notification text and rest chime are original.
