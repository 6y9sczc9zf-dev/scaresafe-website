# ScareSafe Web Platform

The official public ScareSafe website and its separate private administration workspace.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the same public Supabase project values used by the iOS app. Never use a service-role key.
3. Install dependencies with `pnpm install`.
4. Run `pnpm dev`.

The public website is at `/`. The unlisted admin sign-in is at `/admin/login`; `/admin` verifies `public.user_roles.role = 'admin'` on the server before rendering or serving data.

## Database setup

Apply `../supabase/migrations/202608190002_website_admin_cms.sql` after the existing ScareSafe migrations. It adds narrowly scoped, server-verified CMS functions for movie editing and role management. It does not add duplicate movie, profile, proposal, or role tables.

## Validation

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
node --test tests/rendered-html.test.mjs
```

The tests confirm the public landing content, crawler exclusion, and that `/admin` redirects unauthenticated visitors.

## Cloudflare deployment

This repository is configured for Cloudflare Workers as `scaresafe-website` and includes the custom domains `scaresafe.com` and `www.scaresafe.com`.

1. In Cloudflare, open **Workers & Pages**, choose **Create application**, then **Import a repository**.
2. Select `6y9sczc9zf-dev/scaresafe-website` and the `main` branch.
3. Use `pnpm build` as the build command and `pnpm deploy` as the deploy command. The repository root is the project root.
4. After the Worker is created, open **Settings → Variables and Secrets** and add these runtime values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Redeploy after adding the values. Never add a Supabase service-role key.

Cloudflare will create the DNS records and certificates for both configured custom domains. If either hostname already has a conflicting A, AAAA, or CNAME record, remove that placeholder record before the first production deployment.
