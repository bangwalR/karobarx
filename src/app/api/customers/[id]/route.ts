import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/tenant";

// GET single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireTenantContext(request, { module: "customers", action: "read" });
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const supabase = await createClient();
    const profileId = guard.context.profileId!;
    
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      throw error;
    }

    // Fetch customer's orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ 
      customer: {
        ...customer,
        total_spent: customer.total_spent,
      },
      orders: orders?.map(o => ({
        ...o,
        amount: o.amount,
        final_amount: o.final_amount,
      })) || []
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireTenantContext(request, { module: "customers", action: "write" });
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const profileId = guard.context.profileId!;

    const { name, email, phone, whatsapp_number, address, city, status, notes, custom_data } = body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (whatsapp_number !== undefined) updateData.whatsapp_number = whatsapp_number;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (custom_data !== undefined) updateData.custom_data = custom_data;

    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .eq("profile_id", profileId)
      .select()
      .single();

    if (error) {
      console.error("Error updating customer:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer: data, message: "Customer updated successfully" });
  } catch (error) {
    console.error("Error in PUT /api/customers/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireTenantContext(request, { module: "customers", action: "delete" });
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const supabase = await createClient();
    const profileId = guard.context.profileId!;
    
    const { data: customer } = await supabase
      .from("customers")
      .select("id, source_lead_id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error deleting customer:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leadQuery = supabase
      .from("leads")
      .update({
        status: "abandoned",
        customer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", profileId)
      .eq("customer_id", id);

    await leadQuery;

    if (customer.source_lead_id) {
      await supabase
        .from("leads")
        .update({
          status: "abandoned",
          customer_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", profileId)
        .eq("id", customer.source_lead_id);
    }

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/customers/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
