import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

// GET - Fetch conversation threads or messages for a specific phone
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const profileId = getProfileId(request);
    
    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }
    
    const phone = searchParams.get("phone");
    const limit = parseInt(searchParams.get("limit") || "50");
    
    // If phone provided, get all messages for that conversation
    if (phone) {
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("profile_id", profileId)
        .eq("customer_phone", phone)
        .order("created_at", { ascending: true })
        .limit(limit);

      const { data: messages, error } = await query;

      if (error) throw error;

      // Mark messages as read
      await supabase
        .from("whatsapp_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("customer_phone", phone)
        .eq("direction", "inbound")
        .is("read_at", null);

      // Get customer info
      const { data: customer } = await supabase
        .from("customers")
        .select("id, name, phone, email, status, total_orders, total_spent")
        .eq("phone", phone)
        .single();

      return NextResponse.json({
        messages: messages || [],
        customer,
        phone
      });
    }

    // Otherwise, get all conversation threads (grouped by customer)
    let threadsQuery = supabase
      .from("whatsapp_messages")
      .select("customer_phone, customer_name, customer_id, message_text, direction, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    const { data: threads, error } = await threadsQuery;

    if (error) throw error;

    // Group by customer and get latest message + unread count
    const conversationMap = new Map<string, {
      customer_phone: string;
      customer_name: string | null;
      customer_id: string | null;
      last_message: string;
      last_message_direction: string;
      last_message_at: string;
      unread_count: number;
      message_count: number;
    }>();

    for (const msg of threads || []) {
      const existing = conversationMap.get(msg.customer_phone);
      if (!existing) {
        conversationMap.set(msg.customer_phone, {
          customer_phone: msg.customer_phone,
          customer_name: msg.customer_name,
          customer_id: msg.customer_id,
          last_message: msg.message_text || "",
          last_message_direction: msg.direction,
          last_message_at: msg.created_at,
          unread_count: 0,
          message_count: 1
        });
      } else {
        existing.message_count++;
      }
    }

    // Get unread counts
    const { data: unreadData } = await supabase
      .from("whatsapp_messages")
      .select("customer_phone")
      .eq("direction", "inbound")
      .is("read_at", null);

    for (const msg of unreadData || []) {
      const thread = conversationMap.get(msg.customer_phone);
      if (thread) {
        thread.unread_count++;
      }
    }

    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    // Get stats
    const totalConversations = conversations.length;
    const totalUnread = conversations.reduce((acc, c) => acc + c.unread_count, 0);
    const todayConversations = conversations.filter(c => {
      const msgDate = new Date(c.last_message_at).toDateString();
      const today = new Date().toDateString();
      return msgDate === today;
    }).length;

    return NextResponse.json({
      conversations,
      stats: {
        total: totalConversations,
        unread: totalUnread,
        today: todayConversations
      }
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Save a new message (from n8n webhook or admin reply)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const profileId = getProfileId(request);

    const {
      customer_phone,
      customer_name,
      message_id,
      direction = "inbound",
      message_type = "text",
      message_text,
      media_url,
      is_bot_reply = false,
      ai_context = {},
      status = "delivered"
    } = body;

    if (!customer_phone || !message_text) {
      return NextResponse.json(
        { error: "customer_phone and message_text are required" },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = customer_phone.replace(/[^0-9]/g, "").slice(-10);
    const fullPhone = normalizedPhone.length === 10 ? `+91${normalizedPhone}` : customer_phone;

    // Check if customer exists, create if not
    let { data: customer } = await supabase
      .from("customers")
      .select("id, name")
      .or(`phone.eq.${normalizedPhone},phone.eq.${fullPhone},phone.eq.91${normalizedPhone}`)
      .single();

    if (!customer && direction === "inbound") {
      // Auto-create customer on first inbound message
      const { data: newCustomer, error: createError } = await supabase
        .from("customers")
        .insert([{
          name: customer_name || `WhatsApp User`,
          phone: normalizedPhone,
          whatsapp_number: fullPhone,
          status: "new",
          notes: "Auto-created from WhatsApp conversation"
        }])
        .select()
        .single();

      if (!createError) {
        customer = newCustomer;
      }
    }

    // Check for duplicate message_id
    if (message_id) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("message_id", message_id)
        .single();

      if (existing) {
        return NextResponse.json({ 
          message: "Message already exists",
          id: existing.id 
        });
      }
    }

    // Insert message
    const { data: message, error } = await supabase
      .from("whatsapp_messages")
      .insert([{
        customer_id: customer?.id || null,
        customer_phone: fullPhone,
        customer_name: customer_name || customer?.name || null,
        message_id,
        direction,
        message_type,
        message_text,
        media_url,
        is_bot_reply,
        ai_context,
        status,
        read_at: direction === "outbound" ? new Date().toISOString() : null,
        ...(profileId ? { profile_id: profileId } : {}),
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      message,
      customer,
      created: true
    }, { status: 201 });
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
