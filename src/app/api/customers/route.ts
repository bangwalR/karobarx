import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET all customers with stats
export async function GET(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, { module: "customers", action: "read" });
    if (!guard.ok) return guard.response;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const profileId = guard.context.profileId!;

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("profile_id", profileId) // REQUIRED: Filter by profile
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: customers, error, count } = await query;

    if (error) {
      console.error("Error fetching customers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate stats - SCOPED to profile
    const statsQuery = supabase.from("customers").select("status, total_spent").eq("profile_id", profileId);
    const allCustomers = await statsQuery;
    const customersData = allCustomers.data || [];
    
    const stats = {
      total: customersData.length,
      vip: customersData.filter(c => c.status === "vip").length,
      active: customersData.filter(c => c.status === "active").length,
      new: customersData.filter(c => c.status === "new").length,
      avgOrderValue: customersData.length > 0 
        ? Math.round(customersData.reduce((acc, c) => acc + (c.total_spent || 0), 0) / customersData.length)
        : 0,
    };

    return NextResponse.json({ 
      customers: customers?.map(c => ({
        ...c,
        total_spent: c.total_spent,
      })),
      count,
      stats
    });
  } catch (error) {
    console.error("Error in GET /api/customers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new customer
export async function POST(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, { module: "customers", action: "write" });
    if (!guard.ok) return guard.response;

    const supabase = createAdminClient();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body. Send name and phone in the request body." },
        { status: 400 }
      );
    }

    const { name, email, phone, whatsapp_number, address, city, status, notes, custom_data } = body;
    const profileId = guard.context.profileId!;
    const normalizedPhone = String(phone || "").replace(/\D/g, "");
    const normalizedEmail = String(email || "").trim();

    if (!name || !normalizedPhone || !normalizedEmail || !status) {
      return NextResponse.json(
        { error: "Name, phone, email, and status are required" },
        { status: 400 }
      );
    }

    if (normalizedPhone.length !== 10) {
      return NextResponse.json(
        { error: "Phone number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    if (!emailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const customerData: Record<string, unknown> = {
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      whatsapp_number: whatsapp_number || normalizedPhone,
      address: address || null,
      city: city || "Delhi",
      status,
      notes: notes || null,
      custom_data: custom_data || {},
      profile_id: profileId,
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([customerData])
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer: data, message: "Customer created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/customers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Support Postman-friendly /api/customers?id=<customer_uuid>
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, { module: "customers", action: "delete" });
    if (!guard.ok) return guard.response;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const profileId = guard.context.profileId!;

    if (!id) {
      return NextResponse.json(
        { error: "Customer id is required. Use /api/customers?id=<customer_uuid> or /api/customers/<customer_uuid>." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (customerError) {
      console.error("Error finding customer before delete:", customerError);
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { error: leadError } = await supabase
      .from("leads")
      .update({
        status: "abandoned",
        customer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", profileId)
      .eq("customer_id", id);

    if (leadError) {
      console.error("Error detaching leads before customer delete:", leadError);
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    const { data: deletedCustomer, error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      console.error("Error deleting customer:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedCustomer) {
      return NextResponse.json({ error: "Customer was not deleted" }, { status: 500 });
    }

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/customers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
