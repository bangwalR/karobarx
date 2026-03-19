import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";
import { Notifications } from "@/lib/notify";

// GET all inquiries with stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const profileId = getProfileId(request);

    let query = supabase
      .from("inquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profileId) {
      query = query.eq("profile_id", profileId);
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,inquiry_text.ilike.%${search}%`);
    }
    
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (source && source !== "all") {
      query = query.eq("source", source);
    }

    const { data: inquiries, error, count } = await query;

    if (error) {
      console.error("Error fetching inquiries:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate stats
    let statsQuery = supabase.from("inquiries").select("status, created_at");
    if (profileId) statsQuery = statsQuery.eq("profile_id", profileId);
    const allInquiries = await statsQuery;
    const inquiriesData = allInquiries.data || [];
    
    // Get today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newToday = inquiriesData.filter(i => {
      const createdAt = new Date(i.created_at);
      return createdAt >= today && i.status === "new";
    }).length;

    const totalNew = inquiriesData.filter(i => i.status === "new").length;
    const totalReplied = inquiriesData.filter(i => i.status === "replied").length;
    const totalConverted = inquiriesData.filter(i => i.status === "converted").length;
    const totalClosed = inquiriesData.filter(i => i.status === "closed").length;
    
    const conversionRate = inquiriesData.length > 0 
      ? Math.round((totalConverted / inquiriesData.length) * 100) 
      : 0;

    const stats = {
      total: inquiriesData.length,
      new: totalNew,
      newToday,
      replied: totalReplied,
      inProgress: inquiriesData.filter(i => i.status === "in_progress").length,
      converted: totalConverted,
      closed: totalClosed,
      conversionRate,
    };

    return NextResponse.json({ inquiries, count, stats });
  } catch (error) {
    console.error("Error in GET /api/inquiries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new inquiry (for website/n8n)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      name,
      customer_name,
      phone,
      customer_phone,
      message,
      inquiry_text,
      source,
      phone_id,
      notes,
      assigned_to,
      metadata, // For storing conversation details from n8n
    } = body;

    const finalName = customer_name || name;
    const finalPhone = customer_phone || phone;
    const finalMessage = inquiry_text || message;

    if (!finalName || !finalPhone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const profileIdPost = getProfileId(request);

    const inquiryData: Record<string, unknown> = {
      customer_name: finalName,
      customer_phone: finalPhone,
      inquiry_text: finalMessage || "WhatsApp inquiry",
      source: source || "WhatsApp",
      status: "New",
      phone_id: phone_id || null,
      notes: notes || null,
      assigned_to: assigned_to || null,
      metadata: metadata || {}, // Store conversation metadata (intent, bot_reply, etc.)
      ...(profileIdPost ? { profile_id: profileIdPost } : {}),
    };

    const { data, error } = await supabase
      .from("inquiries")
      .insert([inquiryData])
      .select()
      .single();

    if (error) {
      console.error("Error creating inquiry:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire push notification (non-blocking)
    Notifications.newInquiry(finalName, source || "WhatsApp", profileIdPost);

    return NextResponse.json({ inquiry: data, message: "Inquiry created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/inquiries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
