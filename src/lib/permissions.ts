export type AdminRole = "super_admin" | "admin" | "manager" | "staff";
export type PermissionAction = "read" | "write" | "delete";

type ModulePermission = Partial<Record<PermissionAction, boolean>>;
export type RolePermissionMap = Record<string, ModulePermission>;

export const ROLE_PERMISSIONS: Record<AdminRole, RolePermissionMap> = {
  super_admin: {
    dashboard: { read: true },
    inventory: { read: true, write: true, delete: true },
    customers: { read: true, write: true, delete: true },
    orders: { read: true, write: true, delete: true },
    inquiries: { read: true, write: true, delete: true },
    leads: { read: true, write: true, delete: true },
    marketing: { read: true, write: true, delete: true },
    conversations: { read: true, write: true },
    communities: { read: true, write: true, delete: true },
    calendar: { read: true, write: true, delete: true },
    telegram: { read: true, write: true },
    ai_assistant: { read: true, write: true },
    analytics: { read: true },
    settings: { read: true, write: true },
    users: { read: true, write: true, delete: true },
    credentials: { read: true, write: true },
  },
  admin: {
    dashboard: { read: true },
    inventory: { read: true, write: true, delete: true },
    customers: { read: true, write: true, delete: true },
    orders: { read: true, write: true, delete: true },
    inquiries: { read: true, write: true, delete: true },
    leads: { read: true, write: true, delete: true },
    marketing: { read: true, write: true, delete: true },
    conversations: { read: true, write: true },
    communities: { read: true, write: true, delete: true },
    calendar: { read: true, write: true, delete: true },
    telegram: { read: true, write: true },
    ai_assistant: { read: true, write: true },
    analytics: { read: true },
    settings: { read: true, write: true },
    users: { read: true, write: true, delete: true },
    credentials: { read: false, write: false },
  },
  manager: {
    dashboard: { read: true },
    inventory: { read: true, write: true, delete: false },
    customers: { read: true, write: true, delete: false },
    orders: { read: true, write: true, delete: false },
    inquiries: { read: true, write: true, delete: false },
    leads: { read: true, write: true, delete: false },
    marketing: { read: true, write: true, delete: false },
    conversations: { read: true, write: true },
    communities: { read: true, write: true, delete: false },
    calendar: { read: true, write: true, delete: false },
    telegram: { read: true, write: true },
    ai_assistant: { read: true, write: true },
    analytics: { read: true },
    settings: { read: false, write: false },
    users: { read: true, write: true, delete: false },
    credentials: { read: false, write: false },
  },
  staff: {
    dashboard: { read: true },
    inventory: { read: true, write: true, delete: false },
    customers: { read: true, write: true, delete: false },
    orders: { read: true, write: true, delete: false },
    inquiries: { read: true, write: true, delete: false },
    leads: { read: true, write: true, delete: false },
    marketing: { read: false, write: false, delete: false },
    conversations: { read: true, write: true },
    communities: { read: true, write: true, delete: false },
    calendar: { read: true, write: true, delete: false },
    telegram: { read: false, write: false },
    ai_assistant: { read: false, write: false },
    analytics: { read: true },
    settings: { read: false, write: false },
    users: { read: false, write: false, delete: false },
    credentials: { read: false, write: false },
  },
};

const SETTINGS_TAB_ROLES: Record<string, AdminRole[]> = {
  business: ["super_admin", "admin"],
  store: ["super_admin", "admin"],
  team: ["super_admin"],
  profiles: ["super_admin", "admin"],
  notifications: ["super_admin", "admin"],
  whatsapp: ["super_admin", "admin"],
  integrations: ["super_admin", "admin"],
  security: ["super_admin"],
  "custom-fields": ["super_admin", "admin"],
  configuration: ["super_admin", "admin"],
};

export function normalizeRole(role?: string | null): AdminRole {
  if (role === "admin" || role === "manager" || role === "staff" || role === "super_admin") {
    return role;
  }
  return "staff";
}

export function hasPermission(
  role: string | null | undefined,
  module: string,
  action: PermissionAction = "read",
  permissions?: RolePermissionMap | null
) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "super_admin") {
    return ROLE_PERMISSIONS.super_admin[module]?.[action] === true;
  }
  if (module === "settings" && normalizedRole !== "admin") return false;
  if (module === "credentials") return false;
  if (permissions?.[module]?.[action] === true) return true;
  if (permissions?.[module]?.[action] === false) return false;
  return ROLE_PERMISSIONS[normalizedRole][module]?.[action] === true;
}

export function canAccessSettingsTab(
  role: string | null | undefined,
  tabId: string,
  permissions?: RolePermissionMap | null
) {
  if (tabId === "configuration") return normalizeRole(role) === "super_admin";
  if (tabId === "team") return hasPermission(role, "users", "read", permissions);
  if (tabId === "security") return hasPermission(role, "credentials", "write", permissions);
  if (tabId === "whatsapp" || tabId === "integrations") {
    return hasPermission(role, "settings", "read", permissions);
  }
  if (!hasPermission(role, "settings", "read", permissions)) return false;
  return (SETTINGS_TAB_ROLES[tabId] || []).includes(normalizeRole(role));
}

export function canWriteSettingsTab(
  role: string | null | undefined,
  tabId: string,
  permissions?: RolePermissionMap | null
) {
  if (tabId === "configuration") return false;
  if (tabId === "team") return hasPermission(role, "users", "write", permissions);
  if (tabId === "security") return hasPermission(role, "credentials", "write", permissions);
  return canAccessSettingsTab(role, tabId, permissions) && hasPermission(role, "settings", "write", permissions);
}
