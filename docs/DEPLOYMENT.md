# Deployment Guide

## Required Environment Variables

Use `.env.example` as the source of truth. Keep secrets server-side and do not expose service role keys through `NEXT_PUBLIC_*`.

Important variables:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_API_SECRET`
- `RESEND_API_KEY` or a valid `SENDGRID_API_KEY`
- `RESEND_FROM_EMAIL` or a verified sender address

## Database Setup

1. Create the Supabase project.
2. Apply your base schema.
3. Run all SQL migrations in `supabase/migrations`.
4. Confirm the OTP migration is applied:

```text
supabase/migrations/024_supabase_otp_auth.sql
```

## Vercel Deployment

1. Import the repository into Vercel.
2. Set all required environment variables in the Vercel project.
3. Build command:

```bash
npm run build
```

4. Start command:

```bash
npm run start
```

5. After deploy, verify:

- `/api/health`
- Admin login
- OTP email delivery
- private admin API access

## VPS or Coolify Deployment

1. Install Node.js 20+.
2. Clone the repository.
3. Create `.env`.
4. Install dependencies:

```bash
npm install
```

5. Build:

```bash
npm run build
```

6. Start:

```bash
npm run start
```

7. Put the app behind Nginx or Caddy with HTTPS enabled.

## Post-Deploy Checklist

- Rotate any previously committed secrets
- Verify Supabase Auth email templates and allowed redirect URLs
- Verify OTP and Google login flows
- Set `INTERNAL_API_SECRET`
- Check `/api/health`
- Confirm email provider domain/sender verification

## Monitoring

- Add Sentry DSN before production rollout if you want centralized error tracking
- Review server logs for auth failures and internal API access
- Keep provider errors hidden from end users and visible only in server logs
