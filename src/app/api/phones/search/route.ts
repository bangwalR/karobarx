import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

function formatPrice(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();
  const profileId = getProfileId(request);
  
  // SECURITY: Require profile_id cookie - no profile = no access
  if (!profileId) {
    return NextResponse.json(
      { error: "No active profile. Please log out and log back in." },
      { status: 401 }
    );
  }
  
  // Get filter parameters
  const query = searchParams.get("query")?.toLowerCase() || "";
  const brand = searchParams.get("brand");
  const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : null;
  const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : null;
  const status = searchParams.get("status") || "Available";
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;

  // Build Supabase query - ALWAYS scoped to profileId
  let dbQuery = supabase
    .from("phones")
    .select("*")
    .eq("profile_id", profileId)
    .order("selling_price_paise", { ascending: true });

  // Apply status filter
  if (status && status !== "all") {
    dbQuery = dbQuery.eq("status", status);
  }

  // Apply brand filter
  if (brand) {
    dbQuery = dbQuery.ilike("brand", `%${brand}%`);
  }

  // Apply search query
  if (query) {
    dbQuery = dbQuery.or(`model_name.ilike.%${query}%,brand.ilike.%${query}%`);
  }

  // Apply price range
  if (minPrice) {
    dbQuery = dbQuery.gte("selling_price", minPrice);
  }
  if (maxPrice) {
    dbQuery = dbQuery.lte("selling_price", maxPrice);
  }

  // Apply limit
  dbQuery = dbQuery.limit(limit);

  const { data: phones, error } = await dbQuery;

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 });
  }

  // Get total available count
  let countQuery = supabase
    .from("phones")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("status", "Available");
  
  const { count: totalAvailable } = await countQuery;

  // Format response for n8n/WhatsApp
  const formattedResults = (phones || []).map(phone => ({
    id: phone.id,
    name: `${phone.brand} ${phone.model_name}`,
    variant: phone.storage || phone.ram || "",
    color: phone.color || "",
    condition: phone.condition || "",
    battery: phone.battery_health ? `${phone.battery_health}%` : "N/A",
    price: formatPrice(phone.selling_price),
    priceRaw: phone.selling_price,
    warranty: phone.warranty_months ? `${phone.warranty_months} Days` : "No Warranty",
    status: phone.status,
    images: phone.images || [],
    // WhatsApp-friendly text format
    whatsappText: `📱 *${phone.brand} ${phone.model_name}*\n` +
      `💾 ${phone.storage || "N/A"} | 🎨 ${phone.color || "N/A"}\n` +
      `⭐ ${phone.condition || "Good"} | 🔋 ${phone.battery_health || "N/A"}%\n` +
      `💰 *${formatPrice(phone.selling_price)}*\n` +
      `📦 ${phone.warranty_months ? phone.warranty_months + " Days Warranty" : "No Warranty"}\n` +
      `🔗 View: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://mobilehub.delhi'}/phones/${phone.id}`,
  }));

  return NextResponse.json({
    success: true,
    count: formattedResults.length,
    totalAvailable: totalAvailable || 0,
    data: formattedResults,
    // Summary for AI agent
    summary: formattedResults.length > 0 
      ? `Found ${formattedResults.length} phone(s) matching your search.`
      : `No phones found matching "${query}". Try searching for a different brand or model.`,
  });
}

export async function POST(request: NextRequest) {
  // Handle POST requests for more complex queries from n8n
  try {
    const body = await request.json();
    const { query, brand, minBudget, maxBudget, limit = 5 } = body;

    const supabase = await createClient();
    const profileId = getProfileId(request);

    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    // Build Supabase query - ALWAYS scoped to profileId
    let dbQuery = supabase
      .from("phones")
      .select("*")
      .eq("profile_id", profileId)
      .eq("status", "Available")
      .order("selling_price", { ascending: true });

    // Apply brand filter
    if (brand) {
      dbQuery = dbQuery.ilike("brand", `%${brand}%`);
    }

    // Apply search query
    if (query) {
      dbQuery = dbQuery.or(`model_name.ilike.%${query}%,brand.ilike.%${query}%`);
    }

    // Apply price range (prices are now in rupees directly)
    if (minBudget) {
      dbQuery = dbQuery.gte("selling_price", minBudget);
    }
    if (maxBudget) {
      dbQuery = dbQuery.lte("selling_price", maxBudget);
    }

    // Apply limit
    dbQuery = dbQuery.limit(limit);

    const { data: phones, error } = await dbQuery;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 });
    }

    const results = phones || [];

    // Get suggestions if no exact match
    let suggestions: typeof results = [];
    if (results.length === 0) {
      // Suggest similar phones by brand or price range
      if (brand) {
        const { data: brandSuggestions } = await supabase
          .from("phones")
          .select("*")
          .eq("status", "Available")
          .ilike("brand", `%${brand}%`)
          .order("selling_price", { ascending: true })
          .limit(3);
        suggestions = brandSuggestions || [];
      }
      
      if (suggestions.length === 0 && maxBudget) {
        const { data: priceSuggestions } = await supabase
          .from("phones")
          .select("*")
          .eq("status", "Available")
          .lte("selling_price", maxBudget * 1.2)
          .order("selling_price", { ascending: true })
          .limit(3);
        suggestions = priceSuggestions || [];
      }

      // If still no suggestions, get any available phones
      if (suggestions.length === 0) {
        const { data: anySuggestions } = await supabase
          .from("phones")
          .select("*")
          .eq("status", "Available")
          .order("created_at", { ascending: false })
          .limit(3);
        suggestions = anySuggestions || [];
      }
    }

    const formatPhone = (phone: any) => ({
      id: phone.id,
      name: `${phone.brand} ${phone.model_name}`,
      brand: phone.brand,
      model: phone.model_name,
      variant: phone.storage || "",
      color: phone.color || "",
      price: formatPrice(phone.selling_price),
      priceRaw: phone.selling_price,
      condition: phone.condition || "Good",
      battery: phone.battery_health || null,
      warranty: phone.warranty_months ? `${phone.warranty_months} Days` : null,
      images: phone.images || [],
      whatsapp_link: `https://wa.me/919910724940?text=${encodeURIComponent(`Hi! I'm interested in ${phone.brand} ${phone.model_name} (${formatPrice(phone.selling_price)})`)}`,
    });

    // Generate text response for n8n AI agent
    let textResponse = "";
    if (results.length > 0) {
      textResponse = `Found ${results.length} phone(s):\n\n`;
      results.forEach((phone, i) => {
        textResponse += `${i + 1}. *${phone.brand} ${phone.model_name}*\n`;
        textResponse += `   💰 ${formatPrice(phone.selling_price)}\n`;
        if (phone.storage) textResponse += `   💾 ${phone.storage}\n`;
        if (phone.condition) textResponse += `   ✨ ${phone.condition}\n`;
        textResponse += "\n";
      });
      textResponse += "Reply with the number to know more or buy!";
    } else if (suggestions.length > 0) {
      textResponse = "We don't have an exact match, but here are similar options:\n\n";
      suggestions.forEach((phone, i) => {
        textResponse += `${i + 1}. *${phone.brand} ${phone.model_name}* - ${formatPrice(phone.selling_price)}\n`;
      });
    } else {
      textResponse = "Sorry, no phones available matching your criteria. Please try a different search or contact us for help!";
    }

    return NextResponse.json({
      success: true,
      found: results.length > 0,
      count: results.length,
      data: results.map(formatPhone),
      suggestions: suggestions.map(formatPhone),
      text: textResponse,
      message: results.length > 0
        ? `Great news! We have ${results.length} phone(s) available that match your requirements.`
        : suggestions.length > 0
        ? `We don't have an exact match, but here are some similar options you might like:`
        : `Sorry, we currently don't have phones matching your requirements. Please check back later or tell us your preferences and we'll notify you when available!`,
    });
  } catch (err) {
    console.error("Search POST error:", err);
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
