# KarobarX OTP Auth Setup

## Overview

KarobarX now supports Supabase email OTP login and signup while keeping the existing NextAuth session model for protected CRM routes.

Flow:

1. User requests an OTP from `/api/auth/otp/request`
2. Supabase Auth sends the OTP email
3. User verifies the code at `/api/auth/otp/verify`
4. The server links or creates the `admin_users` record
5. The server issues a one-time `otp_ticket`
6. The client exchanges that ticket for a normal app session through NextAuth credentials

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
  or
- `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`
- `INTERNAL_API_SECRET` for internal-only debug and test routes

## Required database migration

Run:

```bash
supabase db push
```

or apply `supabase/migrations/024_supabase_otp_auth.sql` in your production database.

## Production notes

- Verify your sender domain in Resend or SendGrid before testing live OTP or CRM email.
- Rotate any real secrets that were previously committed to local `.env` files.
- Remove or disable placeholder provider keys before deployment.
