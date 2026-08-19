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
