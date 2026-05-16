import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/permissions";

const INTERNAL_ONLY_API_PREFIXES = [
  "/api/cleanup-all",
  "/api/debug-config",
  "/api/debug-ig-conversations",
  "/api/fix-lead-profiles",
  "/api/fix-setup",
  "/api/notifications/test",
  "/api/phones/cleanup",
  "/api/simple-ig-test",
  "/api/test-ig-api",
  "/api/test-ig-connection",
  "/api/test-ig-leads",
  "/api/test-ig-pages",
  "/api/test-nvidia",
];

const ADMIN_ROUTE_MODULES: { prefix: string; module: string }[] = [
  { prefix: "/admin/inventory", module: "inventory" },
  { prefix: "/admin/customers", module: "customers" },
  { prefix: "/admin/leads", module: "leads" },
  { prefix: "/admin/marketing", module: "marketing" },
  { prefix: "/admin/orders", module: "orders" },
  { prefix: "/admin/conversations", module: "conversations" },
  { prefix: "/admin/communities", module: "communities" },
  { prefix: "/admin/inquiries", module: "inquiries" },
  { prefix: "/admin/calendar", module: "calendar" },
  { prefix: "/admin/telegram", module: "telegram" },
  { prefix: "/admin/ai-assistant", module: "ai_assistant" },
  { prefix: "/admin/analytics", module: "analytics" },
  { prefix: "/admin/settings", module: "settings" },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const providedSecret = req.headers.get("x-internal-secret");

  if (INTERNAL_ONLY_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (internalSecret && providedSecret === internalSecret) {
      return NextResponse.next();
    }

    if (!req.auth || req.auth.user?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Only guard /admin routes
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // These admin paths are always public (no auth required)
  if (pathname.startsWith("/admin/setup")) {
    return NextResponse.next();
  }

  // If already logged in, redirect away from login page
  if (pathname.startsWith("/admin/login")) {
    if (req.auth) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // All other /admin paths require an active session
  if (!req.auth) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const routeModule = ADMIN_ROUTE_MODULES.find((item) => pathname.startsWith(item.prefix));
  const moduleName =
    routeModule?.prefix === "/admin/settings" && req.nextUrl.searchParams.get("tab") === "team"
      ? "users"
      : routeModule?.module;

  if (moduleName && !hasPermission(req.auth.user?.role, moduleName, "read", req.auth.user?.permissions)) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
