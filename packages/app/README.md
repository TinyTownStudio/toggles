# Toggles Web

> web app implementation of toggles the feature flag system

## Self-hosted email (optional)

Outbound email is **off by default**. Workspace invites still work: the API returns an `inviteUrl` you can copy and share.

Set in `.dev.vars` / Worker secrets when you want Postmark delivery:

- `TOGGLES_EMAIL_PROVIDER=postmark` (use `none` or omit to disable)
- `POSTMARK_SERVER_TOKEN` — required when provider is `postmark`
- `TOGGLES_EMAIL_FROM` / `TOGGLES_EMAIL_FROM_NAME` — optional sender (defaults to `invites@localhost` / `Toggles`)
