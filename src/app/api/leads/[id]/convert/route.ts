import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireTenantContext(request, { module: "leads", action: "write" });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const profileId = guard.context.profileId!;
  const supabase = createAdminClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (leadError) {
    console.error("Error loading lead:", leadError);
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.phone) {
    return NextResponse.json({ error: "Lead must have a phone number to convert" }, { status: 400 });
  }

  if (lead.status === "converted" && lead.customer_id) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", lead.customer_id)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (existingCustomer) {
      return NextResponse.json({ customer: existingCustomer, lead, converted: false, idempotent: true });
    }
  }

  const { data: customerFromLead } = await supabase
    .from("customers")
    .select("*")
    .eq("profile_id", profileId)
    .eq("source_lead_id", id)
    .maybeSingle();

  let customer = customerFromLead;

  if (!customer) {
    const { data: customerFromPhone } = await supabase
      .from("customers")
      .select("*")
      .eq("profile_id", profileId)
      .eq("phone", lead.phone)
      .maybeSingle();

    customer = customerFromPhone;
  }

  if (!customer) {
    const { data: inserted, error: insertError } = await supabase
      .from("customers")
      .insert([{
        name: lead.name || lead.platform_username || "Unknown",
        email: lead.email || null,
        phone: lead.phone,
        whatsapp_number: lead.phone,
        city: "Delhi",
        status: "new",
        notes: lead.notes || `Converted from ${lead.source} lead`,
        custom_data: {
          source: lead.source,
          source_campaign: lead.source_campaign,
          platform_user_id: lead.platform_user_id,
          platform_username: lead.platform_username,
        },
        source_lead_id: id,
        profile_id: profileId,
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Error converting lead:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    customer = inserted;
  }

  const convertedAt = lead.converted_at || new Date().toISOString();
  const { data: updatedLead, error: updateError } = await supabase
    .from("leads")
    .update({
      status: "converted",
      customer_id: customer.id,
      converted_at: convertedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("profile_id", profileId)
    .select()
    .single();

  if (updateError) {
    console.error("Error marking lead converted:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    customer,
    lead: updatedLead,
    converted: true,
    idempotent: customerFromLead?.id === customer.id,
  });
}
