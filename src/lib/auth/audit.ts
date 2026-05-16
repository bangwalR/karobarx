import { createAdminClient } from "@/lib/supabase/admin";

type AuditEvent = {
  action: string;
  userId?: string | null;
  description: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuthEvent(event: AuditEvent) {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_logs").insert({
      user_id: event.userId ?? null,
      action: event.action,
      description: event.description,
      ip_address: event.ipAddress ?? null,
      metadata: event.metadata ?? {},
    });
  } catch (error) {
    console.error("Failed to write auth audit log:", error);
  }
}
