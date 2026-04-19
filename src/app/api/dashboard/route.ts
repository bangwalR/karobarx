import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatPrice(rupees: number): string {
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)}L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

// GET dashboard stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // CRITICAL: Get the active profile ID to scope all queries
    const profileId = request.cookies.get("active_profile_id")?.value;
    
    if (!profileId) {
      return NextResponse.json({ 
        success: false, 
        error: "No active profile. Please log in again." 
      }, { status: 401 });
    }

    // Fetch all data in parallel - SCOPED to the active profile
    const [phonesRes, ordersRes, customersRes, inquiriesRes] = await Promise.all([
      supabase.from("phones").select("status, selling_price, cost_price, created_at").eq("profile_id", profileId),
      supabase.from("orders").select("status, final_amount, created_at").eq("profile_id", profileId),
      supabase.from("customers").select("status, total_spent, created_at").eq("profile_id", profileId),
      supabase.from("inquiries").select("status, source, created_at").eq("profile_id", profileId),
    ]);

    const phones = phonesRes.data || [];
    const orders = ordersRes.data || [];
    const customers = customersRes.data || [];
    const inquiries = inquiriesRes.data || [];

    // Date calculations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Phone stats
    const availablePhones = phones.filter(p => p.status === "Available");
    const soldPhones = phones.filter(p => p.status === "Sold");
    const reservedPhones = phones.filter(p => p.status === "Reserved");
    
    const inventoryValue = availablePhones.reduce((acc, p) => acc + (p.selling_price || 0), 0);
    const totalRevenue = soldPhones.reduce((acc, p) => acc + (p.selling_price || 0), 0);
    const totalProfit = soldPhones.reduce((acc, p) => acc + ((p.selling_price || 0) - (p.cost_price || 0)), 0);

    // Order stats
    const completedOrders = orders.filter(o => o.status === "completed" || o.status === "delivered");
    const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "processing");
    const orderRevenue = completedOrders.reduce((acc, o) => acc + (o.final_amount || 0), 0);

    // This month stats
    const ordersThisMonth = orders.filter(o => new Date(o.created_at) >= thisMonth);
    const revenueThisMonth = ordersThisMonth
      .filter(o => o.status === "completed" || o.status === "delivered")
      .reduce((acc, o) => acc + (o.final_amount || 0), 0);

    // Last month stats for comparison
    const ordersLastMonth = orders.filter(o => {
      const date = new Date(o.created_at);
      return date >= lastMonth && date <= lastMonthEnd;
    });
    const revenueLastMonth = ordersLastMonth
      .filter(o => o.status === "completed" || o.status === "delivered")
      .reduce((acc, o) => acc + (o.final_amount || 0), 0);

    // Calculate growth percentages
    const revenueGrowth = revenueLastMonth > 0 
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;

    // Customer stats
    const vipCustomers = customers.filter(c => c.status === "vip").length;
    const newCustomersThisMonth = customers.filter(c => new Date(c.created_at) >= thisMonth).length;

    // Inquiry stats
    const newInquiries = inquiries.filter(i => i.status === "new").length;
    const inquiriesToday = inquiries.filter(i => {
      const date = new Date(i.created_at);
      return date >= today;
    }).length;
    const whatsappInquiries = inquiries.filter(i => i.source === "whatsapp").length;
    const convertedInquiries = inquiries.filter(i => i.status === "converted").length;
    const conversionRate = inquiries.length > 0 ? Math.round((convertedInquiries / inquiries.length) * 100) : 0;

    // Recent activity - SCOPED to the active profile
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, phone_name, final_amount, status, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentInquiries } = await supabase
      .from("inquiries")
      .select("id, name, phone, message, source, status, interested_in, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentPhones } = await supabase
      .from("phones")
      .select("id, brand, model_name, selling_price, status, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5);

    const dashboard = {
      // Main stats
      stats: {
        revenue: {
          total: orderRevenue,
          formatted: formatPrice(orderRevenue),
          thisMonth: revenueThisMonth,
          thisMonthFormatted: formatPrice(revenueThisMonth),
          growth: revenueGrowth,
        },
        profit: {
          total: totalProfit,
          formatted: formatPrice(totalProfit),
        },
        inventory: {
          total: phones.length,
          available: availablePhones.length,
          sold: soldPhones.length,
          reserved: reservedPhones.length,
          value: inventoryValue,
          valueFormatted: formatPrice(inventoryValue),
        },
        orders: {
          total: orders.length,
          completed: completedOrders.length,
          pending: pendingOrders.length,
          thisMonth: ordersThisMonth.length,
        },
        customers: {
          total: customers.length,
          vip: vipCustomers,
          newThisMonth: newCustomersThisMonth,
        },
        inquiries: {
          total: inquiries.length,
          new: newInquiries,
          today: inquiriesToday,
          whatsapp: whatsappInquiries,
          conversionRate,
        },
      },
      // Recent activity
      recent: {
        orders: recentOrders?.map(o => ({
          ...o,
          final_amount: o.final_amount,
          final_amount_formatted: formatPrice(o.final_amount),
        })) || [],
        inquiries: recentInquiries || [],
        phones: recentPhones?.map(p => ({
          ...p,
          selling_price: p.selling_price,
          selling_price_formatted: formatPrice(p.selling_price),
        })) || [],
      },
    };

    return NextResponse.json({ success: true, dashboard });
  } catch (error) {
    console.error("Error in GET /api/dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
