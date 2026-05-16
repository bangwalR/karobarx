import { createClient } from "@supabase/supabase-js";

type AdminUserRecord = {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: string;
  permissions: Record<string, Record<string, boolean>> | null;
  is_active: boolean;
  password_hash: string | null;
  profile_id: string | null;
  login_count: number | null;
  failed_login_attempts: number | null;
  locked_until: string | null;
};

export type PasswordLoginResult =
  | { ok: true; user: AdminUserRecord }
  | { ok: false; status: 401 | 403 | 423; error: string; userId?: string };

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getLegacyAdminUser(usernameOrEmail: string, password: string): AdminUserRecord | null {
  const envUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin";
  const envPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "mobilehub@123";
  const envEmail = process.env.ADMIN_EMAIL || "admin@example.com";

  const normalizedIdentifier = usernameOrEmail.trim().toLowerCase();
  const usernameMatches =
    normalizedIdentifier === envUsername.toLowerCase() ||
    normalizedIdentifier === envEmail.toLowerCase();

  if (!usernameMatches || password !== envPassword) {
    return null;
  }

  return {
    id: "env-admin",
    username: envUsername,
    email: envEmail,
    full_name: "Admin (Legacy)",
    role: "super_admin",
    permissions: {
      dashboard: { read: true },
      inventory: { read: true, write: true, delete: true },
      customers: { read: true, write: true, delete: true },
      orders: { read: true, write: true, delete: true },
      inquiries: { read: true, write: true, delete: true },
      leads: { read: true, write: true, delete: true },
      marketing: { read: true, write: true, delete: true },
      conversations: { read: true, write: true },
      settings: { read: true, write: true },
      users: { read: true, write: true, delete: true },
    },
    is_active: true,
    password_hash: null,
    profile_id: null,
    login_count: 0,
    failed_login_attempts: 0,
    locked_until: null,
  };
}

export async function validatePasswordLogin(
  usernameOrEmail: string,
  password: string
): Promise<PasswordLoginResult> {
  const supabase = getServiceSupabase();

  const { data: user } = await supabase
    .from("admin_users")
    .select(
      "id, username, email, full_name, role, permissions, is_active, password_hash, profile_id, login_count, failed_login_attempts, locked_until"
    )
    .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
    .maybeSingle<AdminUserRecord>();

  if (!user) {
    const legacyUser = getLegacyAdminUser(usernameOrEmail, password);
    if (legacyUser) {
      return { ok: true, user: legacyUser };
    }

    return {
      ok: false,
      status: 401,
      error: "No account found for that username or email.",
    };
  }

  if (!user.is_active) {
    return {
      ok: false,
      status: 403,
      error: "This account is deactivated. Ask an admin for access.",
      userId: user.id,
    };
  }

  if (!user.password_hash) {
    return {
      ok: false,
      status: 401,
      error: "This account uses email OTP or Google sign-in. Use Email OTP to continue.",
      userId: user.id,
    };
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    const unlockTime = new Date(user.locked_until).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

    return {
      ok: false,
      status: 423,
      error: `This account is temporarily locked. Try again after ${unlockTime}, or use Email OTP.`,
      userId: user.id,
    };
  }

  const { data: isValid } = await supabase.rpc("verify_password", {
    password,
    hash: user.password_hash,
  });

  if (!isValid) {
    return {
      ok: false,
      status: 401,
      error: "Invalid password. Try again, or use Email OTP if this account was created without a password.",
      userId: user.id,
    };
  }

  return { ok: true, user };
}
