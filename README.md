# DevTinder Backend

## Razorpay Payments

- Keep `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` only in the backend `.env`. The key ID is public and is returned for Checkout; the two secrets must never reach the frontend, logs or Git. Rotate any credential that was previously published or committed.
- Default deployment is `RAZORPAY_MODE=test` and `RAZORPAY_LIVE_ENABLED=false`. Live keys require both `RAZORPAY_MODE=live` and explicit live enablement. Test and live membership snapshots are separate; a test payment cannot grant paid live access.
- Silver costs INR 300 for three calendar months; Gold costs INR 700 for six. These are one-time purchases, not recurring subscriptions. The server computes price/duration; authenticated users cannot edit these in the request or set their own premium flags. Active members cannot start another new purchase. Each captured order grants its own fixed term; purchases do not stack or auto-renew.
- `POST /payment/create` requires an `Idempotency-Key` (16-100 alphanumeric/underscore/hyphen characters). Retries with the same key reuse the stored order. Receipts are unique. Network errors after order creation should be retried with the same key to recover the existing order.
- Checkout calls authenticated `POST /payment/verify`. The server checks the callback HMAC using its stored order ID, then fetches the gateway payment to verify amount, currency, order and capture status. Authorization alone never grants access.
- Configure the **Test Mode** webhook as `https://devs-tinder.in/api/payment/webhook` (note the hyphen). Enable `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`, and `refund.processed`. Retain the same configured secret in the backend environment. Live Mode requires a separately reviewed webhook configuration.
- Webhook HMAC verification uses the original raw bytes before JSON middleware. Event IDs are unique, and updates to payment, membership and webhook audit commit in a MongoDB transaction. Atlas supports transactions; isolated payment tests use `MongoMemoryReplSet`, not standalone MongoDB.
- `GET /payment/status/:orderId` is owner-only and reconciles with Razorpay if the browser callback or webhook was delayed. Full refunds revoke that order's access; partial refunds preserve access under the current policy. Refunded orders cannot be reactivated by stale capture notifications. Expired memberships are inactive in API responses.
- No card/CVV/OTP values are handled by our backend. Use Razorpay's hosted Checkout. Do not enable real-money payments until business activation, real premium benefits, refund/support policies and a separately approved live transaction have been reviewed. Chat and connection-limit entitlements are not implemented by this payment change; the UI must not promise them.
- `npm test` includes mocked payment/security/transaction regressions without external gateway calls. The frontend `npm run test:payments` exercises both plans, cancellation, failure, missed-callback recovery, gateway/script errors, reload persistence and mobile layouts against an isolated database and a mocked gateway.
- `src/scripts/paymentTestFixtures.js create|status|cleanup <32-hex-run-id>` is SSH-only and refuses non-test gateway settings. Its optional `refund` action also requires `--allow-test-payment-api` and refunds only the selected disposable account's captured test payment. Never expose it as an HTTP route. Test cleanup removes only that fixture's users, relationships, test payments and webhook events; Razorpay retains its sandbox transaction history.
- Verification on 2026-11-27: real Test Mode Silver netbanking failure/retry/capture, Gold test-card capture, signed payment webhooks, and a processed full card refund with automatic membership revocation passed on the deployed app. The tested YESB netbanking full refund returned HTTP 400 `BAD_REQUEST_ERROR: invalid request sent` from both Razorpay's API and its own dashboard. Its cause is not established; investigate with Razorpay before treating netbanking refunds as verified. Do not bypass gateway state or manually mark an unsuccessful refund as processed.

Use Node.js 24.14.1, then run `npm install`.

## Development

- `npm run start:local` starts port 7777 with temporary MongoDB data. Email and cron are disabled unless explicitly enabled in the process environment. Production feedback queue settings are always cleared for this temporary database. Data is removed when the process stops.
- For persistent Atlas data, configure `.env` using `.env.example` and run `npm start` or `npm run dev`.
- `npm test` runs API, access-control, reminder, fixture-safety, and email tests with isolated data and no AWS calls.

## Deployment

- Run the app using PM2 as `devTinder-backend`, with `NODE_ENV=production` and `CLIENT_ORIGIN=https://devs-tinder.in`.
- Nginx proxies `/api/` to port 7777. Keep the database connection string, JWT secret, AWS credentials, and SSH keys outside Git.
- After copying frontend build files, ensure Nginx can read them: `/var/www/html` directories should be mode 755 and static files mode 644. Do not copy a private backup umask onto public assets. Keep `.env` and backups private.
- Save the PM2 process list and enable its `pm2-ubuntu` systemd service for reboot recovery.
- `GET /health` pings MongoDB with a two-second timeout. It returns 200 when ready, or 503 when the database is unavailable.
- Atlas must be resumed and must allow the EC2 outgoing public IP. Do not use a world-open access list to work around connectivity failures.

## Email Reminders

- Interested requests notify their actual recipient; ignored profiles do not trigger email.
- `DISABLE_EMAILS=true` suppresses outbound SES calls. `DISABLE_CRON=true` disables the daily reminder job.
- `CRON_EXPRESSION` defaults to `0 8 * * *`, interpreted in the server's timezone. On the current EC2 host that is UTC.
- Reminder selection includes yesterday's final millisecond and deduplicates recipients. It is not a durable queue or a delivery guarantee.
- Reminder links use the configured frontend origin. Runs do not overlap, and scheduler failures remain visible to monitoring.

## Live Verification

Run the frontend repository's `npm run test:e2e -- --live` with `E2E_SSH_KEY` set. Its synthetic example.com users remain opted out, and isolated test servers explicitly clear feedback queue settings. The separate live email test uses only the configured inbox and AWS simulator addresses; it does not change the production cron schedule.

`src/scripts/liveTestFixtures.js` is an SSH-only test utility, not an HTTP endpoint. It requires an exact random run ID, accepts only reserved example.com test addresses, and refuses to operate on more than 16 test accounts. It isolates those accounts' feeds and removes their temporary records after verification. Never run the isolated API test suite against production data.

### Real Email Delivery

From EC2, `npm run test:email:live -- --send-to-configured-inbox` sends a confirmation (for a temporary inbox account), a notification through the live request API, a real scheduled reminder, and two AWS mailbox-simulator messages. It verifies confirmation, scanner-safe links, withdrawal, skipped sends after withdrawal, and real SES -> SNS -> SQS -> MongoDB suppression. It uses a temporary sender and scopes the reminder to its single request, then removes temporary users/requests and simulator-only suppression rows. The normal PM2 cron schedule is unchanged. The API recipient must be permitted by the SES account's current sending mode. An existing real inbox account must already have confirmed consent; the script will not change its preferences.

The report is saved under ignored `artifacts/email-e2e/`. An SES message ID proves acceptance, not inbox arrival; separately verify the messages in the recipient mailbox using their RFC Message-ID and Inbox/Spam labels.

Add `--await-inbox-confirmation` to pause for up to five minutes after sending the confirmation. Open the actual message in the configured inbox and submit its confirmation form; the test then continues. Without that flag, the test submits the same signed confirmation through HTTP for non-interactive runs.

If SES reports `ProductionAccessEnabled=false`, it is still in sandbox mode: recipients must be verified, and the daily quota is limited. Successful delivery to a verified test inbox does not prove delivery to arbitrary app users. Request AWS production access before relying on notifications to unverified recipients.

## Email Consent and Feedback

- Existing and new accounts default to email notifications off. The optional signup checkbox and Profile > Email notifications record the recipient address, policy version `connection-emails-v1`, source and request timestamp. No purchased, scraped or imported list is enrolled by this code.
- Opt-in sends a confirmation link, valid for seven days. Notifications and reminders stay off until the user submits the confirmation form. Confirmation sends are throttled to one per minute per account. In the sandbox, delivery can still fail for an unverified recipient; Profile offers resend.
- Each notification includes a signed unsubscribe link (valid for one year) and a profile link. GET requests only render a confirmation form, so link scanners cannot change preferences. POST withdraws consent without requiring login. Changing email resets consent. Old confirmation links cannot re-enable withdrawn or replaced consent.
- `sendEmail` checks `emailsuppressions` before every outbound SES call, including confirmations. Permanent bounces and spam complaints are suppressed. Transient bounces and not-spam reports are audited without creating a permanent block. Enabling preferences does not clear suppression; review the delivery issue manually before any deliberate unblock.
- Feedback uses the private Sydney Standard SNS topic `devtinder-ses-feedback` and encrypted SQS queue of the same name. The topic accepts only this account's SES identity; only that topic can enqueue. No public webhook or unsigned HTTP payload is trusted.
- Set `SES_FEEDBACK_QUEUE_URL` and `SES_FEEDBACK_TOPIC_ARN` in the EC2 `.env`. The backend polls sequentially using long polling. It acknowledges only after durable suppression/audit writes. Repeated SNS messages are idempotent, and poison messages move to `devtinder-ses-feedback-dlq` after five receives. Queue retention is 14 days. Only the main PM2 process should consume this queue.
- `src/scripts/setupSesFeedback.sh --apply` provisions the named resources and the backend user's receive/delete/get-attributes policy using a separately authorized administrator session. It checks account ownership tags before replacing resource policies. Never give the application provisioning/admin credentials.
- Operational checks: review `pm2 logs devTinder-backend` for `SES feedback processed`, `SES feedback poll failed`, or `SES feedback message retained for retry`; inspect the SQS dead-letter queue and SES Reputation metrics in Sydney. Resolve persistent poll errors and inspect failed messages before redriving; do not purge the queue to hide failures. The backend IAM user deliberately cannot read the DLQ or provision resources.
- Feedback/audit collections contain recipient addresses and message IDs, not raw email bodies. Treat them as private operational data. Monitor queue failures in the AWS console; inbox delivery is never guaranteed by SES acceptance or production approval.
