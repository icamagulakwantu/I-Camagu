# iCamagu development and deployment workflow

**Authoritative source:** this GitHub repository, especially the reviewed `main` branch.

**Production hosting:** Render. The public app, backend process, build/start configuration, health checks and runtime environment are managed through Render.

## Required workflow

1. Inspect the live GitHub repository before proposing changes. Do not treat an uploaded ZIP or an external editor workspace as the source of truth when GitHub is available.
2. Make substantive code changes on a dedicated GitHub branch.
3. Open a pull request against `main`; explain the change, safety implications and test evidence.
4. Require GitHub Actions CI to pass, including PostgreSQL integration tests for database/financial behavior and migration-baseline validation where relevant.
5. Merge only a reviewed, passing change. A merge to `main` triggers Render auto-deploys, so confirm both Render services and their latest deployment status afterwards.
6. Verify production behavior from Render logs and health checks. Do not claim a deployment is healthy solely because the frontend build passed.
7. Keep secrets in Render environment settings. Never commit API keys, database credentials, encryption keys or payment-provider secrets.

## Explicit platform boundary

- **Use GitHub for repository inspection, branches, commits, pull requests, reviews and CI.**
- **Use Render for production deployment, service settings, runtime logs and health verification.**
- Do not use StackBlitz, Bolt, or another hosted code workspace as a source of truth, code-editing target, or deployment target for this project. Old automated bot comments or historical links do not change this policy.
- Do not delete or disable a Render service until the canonical URL, custom-domain attachment, database target, environment settings, webhooks and real traffic have been verified.
- Do not run schema changes or financial concurrency tests against production. Use disposable PostgreSQL CI or a separately restored staging database.

## Current operational note

Two Render web services currently point to the same GitHub repository and `main`, and both auto-deploy. The primary-domain service appears to be `I-Camagu-1`, but service consolidation remains a release task until environment/database parity, callbacks, health checks and DNS are confirmed. See [launch readiness](./LAUNCH_READINESS.md).


## Runtime target guard

CI runs `yarn check:runtime-targets` against application code, public assets, shared modules, deployment workflows and runtime configuration. It fails if a StackBlitz, Bolt.new or WebContainer reference is introduced there. Historical mentions in documentation are allowed; they do not change the GitHub + Render-only workflow.
