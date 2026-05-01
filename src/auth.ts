import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { DefaultSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";

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
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const supabase = getServiceSupabase();

        const { data: user } = await supabase
          .from("admin_users")
          .select(
            "id, username, email, full_name, role, permissions, is_active, password_hash, profile_id, login_count"
          )
          .or(
            `username.eq.${credentials.username},email.eq.${credentials.username}`
          )
          .single();

        if (!user || !user.is_active) return null;

        const { data: isValid } = await supabase.rpc("verify_password", {
          password: credentials.password as string,
          hash: user.password_hash,
        });

        if (!isValid) return null;

        // Fire-and-forget: update last_login
        supabase
          .from("admin_users")
          .update({
            last_login_at: new Date().toISOString(),
            login_count: (user.login_count || 0) + 1,
          })
          .eq("id", user.id)
          .then(() => {});

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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = user.username;
        token.role = user.role;
        token.permissions = user.permissions;
        token.profile_id = user.profile_id ?? null;
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
