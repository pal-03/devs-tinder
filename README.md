# DevTinder Backend

Use Node.js 24.14.1, then run `npm install`.

## Development

- `npm run start:local` starts port 7777 with temporary MongoDB data. Email and cron are disabled unless explicitly enabled in the process environment. Data is removed when the process stops.
- For persistent Atlas data, configure `.env` using `.env.example` and run `npm start` or `npm run dev`.
- `npm test` runs API, access-control, reminder, fixture-safety, and email tests with isolated data and no AWS calls.

## Deployment

- Run the app using PM2 as `devTinder-backend`, with `NODE_ENV=production` and `CLIENT_ORIGIN=https://devs-tinder.in`.
- Nginx proxies `/api/` to port 7777. Keep the database connection string, JWT secret, AWS credentials, and SSH keys outside Git.
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

Run the frontend repository's `npm run test:e2e -- --live` with `E2E_SSH_KEY` set. Disable email and cron while running it, then restore their previous settings.

`src/scripts/liveTestFixtures.js` is an SSH-only test utility, not an HTTP endpoint. It requires an exact random run ID, accepts only reserved example.com test addresses, and refuses to operate on more than 16 test accounts. It isolates those accounts' feeds and removes their temporary records after verification. Never run the isolated API test suite against production data.

### Real Email Delivery

From EC2, `npm run test:email:live -- --send-to-configured-inbox` sends two real messages to `SES_TO_ADDRESS`: a notification through the live request API, followed by a real scheduled reminder tick. It uses a temporary sender and scopes the reminder to its single request, then removes temporary database records. The normal PM2 cron schedule is unchanged. The API recipient must be permitted by the SES account's current sending mode.

The report is saved under ignored `artifacts/email-e2e/`. An SES message ID proves acceptance, not inbox arrival; separately verify the messages in the recipient mailbox using their RFC Message-ID and Inbox/Spam labels.

If SES reports `ProductionAccessEnabled=false`, it is still in sandbox mode: recipients must be verified, and the daily quota is limited. Successful delivery to a verified test inbox does not prove delivery to arbitrary app users. Request AWS production access before relying on notifications to unverified recipients.
