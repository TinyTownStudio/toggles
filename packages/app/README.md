# Toggles Web

> web app implementation of toggles the feature flag system

## Workspaces (teams)

Pro users can create a workspace, invite members, and scope projects to teams. When outbound email is disabled, invitation APIs return a copyable `inviteUrl` for air-gapped or self-hosted installs.

## Self-hosted email (optional)

Outbound email is **off by default** on the Node/Docker build. Nothing is sent over the network until SMTP is configured. Workspace invites still return a copyable link when email is disabled.

Set these environment variables (`.dev.vars` locally, container env in Docker):

| Variable                  | Description                                                                    |
| ------------------------- | ------------------------------------------------------------------------------ |
| `TOGGLES_EMAIL_PROVIDER`  | `smtp`, `none`, or omit (auto: `smtp` only when all SMTP fields below are set) |
| `TOGGLES_EMAIL_FROM`      | Sender address (default `noreply@localhost`)                                   |
| `TOGGLES_EMAIL_FROM_NAME` | Sender display name (default `Toggles`)                                        |
| `TOGGLES_SMTP_HOST`       | SMTP server hostname                                                           |
| `TOGGLES_SMTP_PORT`       | SMTP port (e.g. `587` or `465`)                                                |
| `TOGGLES_SMTP_SECURE`     | `true` / `false` for TLS (defaults to `true` when port is `465`)               |
| `TOGGLES_SMTP_USER`       | SMTP username                                                                  |
| `TOGGLES_SMTP_PASSWORD`   | SMTP password                                                                  |

## Hosted email (Cloudflare Workers)

The production Worker uses the [`send_email`](https://developers.cloudflare.com/email-service/configuration/send-bindings/) binding named `EMAIL` in `wrangler.jsonc`. With no `TOGGLES_EMAIL_PROVIDER`, outbound mail uses Cloudflare Email when that binding is available.

Optional Worker vars / secrets:

- `TOGGLES_EMAIL_PROVIDER` — `cloudflare`, `none`, or omit (default `cloudflare` when `EMAIL` is bound)
- `TOGGLES_EMAIL_FROM` / `TOGGLES_EMAIL_FROM_NAME` — verified sender on your Email Service domain

Application code should import from `api/lib/email` (`sendEmail`, `resolveEmailProvider`, etc.).
