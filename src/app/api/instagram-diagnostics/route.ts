import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/instagram-diagnostics - Complete Instagram connection diagnostics
export async function GET() {
  const supabase = createAdminClient();

  // Get connection
  const { data: conn } = await supabase
    .from("social_connections")
    .select("*")
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .single();

  if (!conn) {
    return NextResponse.json({
      error: "No Instagram connection found",
      solution: "Go to Settings → Integrations and connect Instagram"
    });
  }

  const diagnostics: Record<string, unknown> = {
    connection: {
      account_id: conn.account_id,
      account_name: conn.account_name,
      connected_at: conn.created_at,
      last_synced: conn.last_synced_at,
      token_expires: conn.token_expires_at,
    },
    tests: {},
  };

  try {
    // Test 1: Check if token is valid
    const meUrl = `https://graph.instagram.com/v25.0/me?fields=id,username,account_type&access_token=${conn.access_token}`;
    const meRes = await fetch(meUrl);
    const meData = await meRes.json();
    
    diagnostics.tests = {
      ...diagnostics.tests as object,
      tokenValid: {
        status: meRes.ok ? "✅ Valid" : "❌ Invalid",
        response: meData,
      }
    };

    // Test 2: Check account type
    if (meData.account_type) {
      diagnostics.tests = {
        ...diagnostics.tests as object,
        accountType: {
          type: meData.account_type,
          isBusinessAccount: meData.account_type === "BUSINESS",
          note: meData.account_type === "BUSINESS" 
            ? "✅ Correct - Business account can access DMs" 
            : "❌ Wrong - Must be BUSINESS account to access DMs"
        }
      };
    }

    // Test 3: Try to fetch conversations
    const convUrl = `https://graph.instagram.com/v25.0/me/conversations?platform=instagram&fields=id,participants&limit=5&access_token=${conn.access_token}`;
    const convRes = await fetch(convUrl);
    const convData = await convRes.json();
    
    diagnostics.tests = {
      ...diagnostics.tests as object,
      conversations: {
        status: convRes.ok ? "✅ API works" : "❌ API error",
        count: convData.data?.length || 0,
        hasError: !!convData.error,
        error: convData.error,
        sample: convData.data?.[0],
        note: convData.data?.length > 0 
          ? `✅ Found ${convData.data.length} conversations` 
          : convData.error 
          ? `❌ Error: ${convData.error.message}` 
          : "⚠️ No conversations found (account might have no DMs)"
      }
    };

    // Test 4: Check permissions
    const permUrl = `https://graph.instagram.com/v25.0/me/permissions?access_token=${conn.access_token}`;
    const permRes = await fetch(permUrl);
    const permData = await permRes.json();
    
    diagnostics.tests = {
      ...diagnostics.tests as object,
      permissions: {
        granted: permData.data?.map((p: { permission: string; status: string }) => 
          `${p.permission}: ${p.status}`
        ) || [],
        hasMessagesPermission: permData.data?.some((p: { permission: string; status: string }) => 
          p.permission === "instagram_business_manage_messages" && p.status === "granted"
        ),
      }
    };

  } catch (err: unknown) {
    diagnostics.error = err instanceof Error ? err.message : "unknown";
  }

  // Recommendations
  const recommendations = [];
  const tests = diagnostics.tests as Record<string, { status?: string; hasError?: boolean; count?: number; hasMessagesPermission?: boolean; type?: string }>;
  
  if (tests.tokenValid?.status?.includes("❌")) {
    recommendations.push("🔴 Token is invalid - Reconnect Instagram");
  }
  
  if (tests.accountType?.type !== "BUSINESS") {
    recommendations.push("🔴 CRITICAL: Account must be Instagram Business Account");
    recommendations.push("   → Open Instagram app → Settings → Account → Switch to Professional Account → Business");
  }
  
  if (tests.conversations?.hasError) {
    recommendations.push("🔴 API Error - Check permissions or reconnect");
  }
  
  if (tests.conversations?.count === 0 && !tests.conversations?.hasError) {
    recommendations.push("⚠️ No conversations found - Account might have no DMs or wrong account type");
  }
  
  if (!tests.permissions?.hasMessagesPermission) {
    recommendations.push("🔴 Missing 'instagram_business_manage_messages' permission");
    recommendations.push("   → Reconnect Instagram and grant all permissions");
  }

  return NextResponse.json({
    ...diagnostics,
    recommendations,
    nextSteps: recommendations.length > 0 
      ? "Follow the recommendations above to fix issues"
      : "✅ Everything looks good! Try syncing: POST /api/leads/sync-instagram"
  });
}
