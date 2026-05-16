import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { DefaultSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { logAuthEvent } from "@/lib/auth/audit";
import { validatePasswordLogin } from "@/lib/auth/password-login";

// ─── Session / JWT type augmentation ──────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      permissions?: Record<string, Record<string, boolean>>;
      /** null = super admin (access all profiles) */
      profile_id: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    username?: string;
    role?: string;
    permissions?: Record<string, Record<string, boolean>>;
    profile_id?: string | null;
  }
  interface JWT {
    id?: string;
    username?: string;
    role?: string;
    permissions?: Record<string, Record<string, boolean>>;
    profile_id?: string | null;
  }
}

// Use service-role Supabase (bypasses RLS, no cookie context needed in authorize)
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────────────
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Username / Password ───────────────────────────────────────────────────
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        otp_ticket: { label: "OTP Ticket", type: "text" },
      },
      async authorize(credentials) {
        const supabase = getServiceSupabase();

        if (credentials?.otp_ticket) {
          const { data: ticket, error: ticketError } = await supabase
            .from("auth_otp_tickets")
            .select("id, admin_user_id, email, expires_at, consumed_at")
            .eq("ticket", credentials.otp_ticket)
            .maybeSingle();

          if (ticketError || !ticket || ticket.consumed_at || new Date(ticket.expires_at).getTime() < Date.now()) {
            return null;
          }

          const { data: user, error: userError } = await supabase
            .from("admin_users")
            .select("id, username, email, full_name, role, permissions, is_active, profile_id, login_count")
            .eq("id", ticket.admin_user_id)
            .maybeSingle();

          if (userError || !user || !user.is_active) {
            return null;
          }

          await supabase
            .from("auth_otp_tickets")
            .update({ consumed_at: new Date().toISOString() })
            .eq("id", ticket.id);

          await supabase
            .from("admin_users")
            .update({
              last_login_at: new Date().toISOString(),
              login_count: (user.login_count || 0) + 1,
              failed_login_attempts: 0,
              locked_until: null,
              last_failed_login_at: null,
            })
            .eq("id", user.id);

          await logAuthEvent({
            userId: user.id,
            action: "otp_login",
            description: `User ${user.username} logged in with email OTP`,
          });

          return {
            id: user.id,
            name: user.full_name || user.username,
            email: user.email ?? "",
            username: user.username,
            role: user.role,
            permissions: user.permissions,
            profile_id: user.profile_id ?? null,
          };
        }

        if (!credentials?.username || !credentials?.password) return null;

        const validation = await validatePasswordLogin(
          credentials.username as string,
          credentials.password as string
        );

        if (!validation.ok) {
          if (validation.userId && validation.status === 401 && validation.error.startsWith("Invalid password.")) {
            const { data: currentUser } = await supabase
              .from("admin_users")
              .select("failed_login_attempts")
              .eq("id", validation.userId)
              .maybeSingle();

            const nextAttempts = (currentUser?.failed_login_attempts || 0) + 1;
            const lockedUntil = nextAttempts >= 5
              ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
              : null;

            await supabase
              .from("admin_users")
              .update({
                failed_login_attempts: nextAttempts,
                locked_until: lockedUntil,
                last_failed_login_at: new Date().toISOString(),
              })
              .eq("id", validation.userId);

            await logAuthEvent({
              userId: validation.userId,
              action: "failed_login",
              description: `Failed password login for ${credentials.username}`,
            });
          }
          return null;
        }

        const { user } = validation;

        if (user.id !== "env-admin") {
          await supabase
            .from("admin_users")
            .update({
              last_login_at: new Date().toISOString(),
              login_count: (user.login_count || 0) + 1,
              failed_login_attempts: 0,
              locked_until: null,
              last_failed_login_at: null,
            })
            .eq("id", user.id);

          await logAuthEvent({
            userId: user.id,
            action: "login",
            description: `User ${user.username} logged in with password`,
          });
        }

        return {
          id: user.id,
          name: user.full_name || user.username,
          email: user.email ?? "",
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          profile_id: user.profile_id ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // ── Guard: only allow Google sign-in for existing active admin_users ──────
    // If callbackUrl contains google=1 it's a sign-UP → auto-create the record
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email) return false;

        const supabase = getServiceSupabase();

        // Check if user already exists
        const { data: existing } = await supabase
          .from("admin_users")
          .select("id, is_active")
          .eq("email", profile.email)
          .single();

        // Existing active user → allow sign-in
        if (existing?.is_active) return true;

        // Existing but inactive → block
        if (existing && !existing.is_active) return "/admin/login?error=google_not_allowed";

        // New user → auto-create as owner/admin (sign-up flow)
        const adminPermissions = {
          dashboard: { read: true },
          inventory: { read: true, write: true, delete: true },
          customers: { read: true, write: true, delete: true },
          orders: { read: true, write: true, delete: true },
          inquiries: { read: true, write: true, delete: true },
          leads: { read: true, write: true, delete: true },
          marketing: { read: true, write: true, delete: true },
          settings: { read: true, write: true },
          users: { read: true, write: true, delete: true },
        };

        const username = (profile.email.split("@")[0] + "_" + Date.now().toString().slice(-4))
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .toLowerCase();

        const { error: insertError } = await supabase
          .from("admin_users")
          .insert({
            username,
            email: profile.email,
            full_name: profile.name || profile.email.split("@")[0],
            role: "admin",
            is_active: true,
            permissions: adminPermissions,
            // No password_hash — Google-only account
          });

        if (insertError) return "/admin/login?error=signup_failed";

        return true;
      }
      return true;
    },

    // ── Enrich JWT with role / permissions from admin_users ───────────────────
    async jwt({ token, user, account }) {
      // Credentials flow: user object is populated on first sign-in
      if (user) {
        token.id = user.id!;
        token.username = user.username;
        token.role = user.role;
        token.permissions = user.permissions;
        token.profile_id = user.profile_id ?? null;
      }

      // Google flow: fetch role/permissions from admin_users by email
      if (account?.provider === "google" && token.email && !token.role) {
        const supabase = getServiceSupabase();
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("id, username, role, permissions, profile_id, login_count")
          .eq("email", token.email)
          .single();

        if (adminUser) {
          token.id = adminUser.id;
          token.username = adminUser.username;
          token.role = adminUser.role;
          token.permissions = adminUser.permissions;
          token.profile_id = adminUser.profile_id ?? null;

          // Fire-and-forget: update last_login
          supabase
            .from("admin_users")
            .update({
              last_login_at: new Date().toISOString(),
              login_count: (adminUser.login_count || 0) + 1,
            })
            .eq("id", adminUser.id)
            .then(() => {});

          await logAuthEvent({
            userId: adminUser.id,
            action: "google_login",
            description: `User ${adminUser.username} logged in with Google`,
          });
        }
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.role = token.role as string;
      session.user.permissions = token.permissions as Record<string, Record<string, boolean>> | undefined;
      session.user.profile_id = (token.profile_id ?? null) as string | null;
      return session;
    },
  },

  pages: {
    signIn: "/admin/login",
  },

  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
});
