# KarobarX CRM

KarobarX CRM is a Next.js App Router CRM and admin system for customer management, leads, inventory, orders, campaigns, and messaging workflows.

## Stack

- Next.js 16.1.1
- React 19.2.3
- TypeScript
- Tailwind CSS 4
- Supabase (Postgres + Auth)
- NextAuth for admin session handling

## Core Features

- Admin dashboard and analytics
- Customer, lead, inquiry, and order management
- Inventory and product catalog
- Email and campaign workflows
- WhatsApp, Instagram, Facebook, and Telegram integrations
- Supabase email OTP signup/login flow for admin users

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Apply your Supabase schema and migrations, including:

```text
supabase/migrations/024_supabase_otp_auth.sql
```

4. Start development:

```bash
npm run dev
```

5. Open:

- App: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Authentication

KarobarX CRM now supports Supabase email OTP authentication for admin users.

- Request OTP: `/api/auth/otp/request`
- Verify OTP: `/api/auth/otp/verify`
- Session creation: NextAuth credentials flow using a one-time OTP ticket

See [docs/AUTH_OTP_SETUP.md](docs/AUTH_OTP_SETUP.md) for setup details.

## Production

- Health check: `/api/health`
- Secure headers are configured in `next.config.ts`
- Sensitive internal/debug routes should be protected with `INTERNAL_API_SECRET`

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment steps.
