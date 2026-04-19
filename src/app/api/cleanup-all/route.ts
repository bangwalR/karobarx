import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

// DELETE - Remove all data for current profile (phones, orders, customers, inquiries)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const profileId = getProfileId(request);
    
    // SECURITY: Require profileId
    if (!profileId) {
      return NextResponse.json({ 
        error: "No active profile. Please log in again." 
      }, { status: 401 });
    }

    const results = {
      phones: 0,
      orders: 0,
      customers: 0,
      inquiries: 0,
      conversations: 0
    };

    // Count and delete phones
    const { count: phonesCount } = await supabase
      .from("phones")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);
    
    if (phonesCount && phonesCount > 0) {
      await supabase.from("phones").delete().eq("profile_id", profileId);
      results.phones = phonesCount;
    }

    // Count and delete orders
    const { count: ordersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);
    
    if (ordersCount && ordersCount > 0) {
      await supabase.from("orders").delete().eq("profile_id", profileId);
      results.orders = ordersCount;
    }

    // Count and delete customers
    const { count: customersCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);
    
    if (customersCount && customersCount > 0) {
      await supabase.from("customers").delete().eq("profile_id", profileId);
      results.customers = customersCount;
    }

    // Count and delete inquiries
    const { count: inquiriesCount } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);
    
    if (inquiriesCount && inquiriesCount > 0) {
      await supabase.from("inquiries").delete().eq("profile_id", profileId);
      results.inquiries = inquiriesCount;
    }

    // Count and delete WhatsApp conversations
    const { count: conversationsCount } = await supabase
      .from("whatsapp_messages")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);
    
    if (conversationsCount && conversationsCount > 0) {
      await supabase.from("whatsapp_messages").delete().eq("profile_id", profileId);
      results.conversations = conversationsCount;
    }

    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({ 
      success: true,
      message: `Successfully cleaned up all data. Deleted ${totalDeleted} total records.`,
      details: results
    });
  } catch (error) {
    console.error("Error in DELETE /api/cleanup-all:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}