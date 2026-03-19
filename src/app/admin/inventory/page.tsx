"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertCircle,
  TrendingUp,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";

interface InventoryItem {
  id: string;
  brand: string;
  model_name: string;
  variant: string | null;
  color: string | null;
  condition_grade: string;
  battery_health_percent: number | null;
  selling_price: number;
  cost_price: number;
  original_mrp: number | null;
  images: string[] | null;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  Available:      { label: "In Stock",  color: "bg-green-500/20 text-green-500" },
  Reserved:       { label: "Reserved",  color: "bg-yellow-500/20 text-yellow-500" },
  Sold:           { label: "Sold",      color: "bg-gray-500/20 text-gray-500" },
  "Under Repair": { label: "Repair",    color: "bg-orange-500/20 text-orange-500" },
  "Quality Check":{ label: "QC",        color: "bg-blue-500/20 text-blue-500" },
  "Listed Online":{ label: "Listed",    color: "bg-cyan-500/20 text-cyan-500" },
};

export default function InventoryPage() {
  const biz = useBusiness();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("phones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${biz.product_name_singular.toLowerCase()}?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("phones").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting item:", err);
      alert(`Failed to delete ${biz.product_name_singular.toLowerCase()}`);
    }
  };

  const filteredItems = items.filter((item) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      item.model_name.toLowerCase().includes(search) ||
      item.brand.toLowerCase().includes(search);
    const matchesCategory = selectedCategory === "all" || item.brand === selectedCategory;
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Dynamic condition labels from biz config
  const conditionLabel = (grade: string) =>
    (biz.condition_labels as Record<string, string>)?.[grade] || grade;

  const categories = (biz.primary_categories as string[]) || [];

  const statsData = [
    {
      label: `Total ${biz.product_name_plural}`,
      value: items.length,
      icon: Package,
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "In Stock",
      value: items.filter((p) => p.status === "Available").length,
      icon: Package,
      color: "from-green-500 to-emerald-600",
    },
    {
      label: "Reserved / QC",
      value: items.filter((p) => p.status === "Reserved" || p.status === "Quality Check").length,
      icon: AlertCircle,
      color: "from-yellow-500 to-orange-600",
    },
    {
      label: "Sold",
      value: items.filter((p) => p.status === "Sold").length,
      icon: TrendingUp,
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{biz.product_name_plural}</h1>
          <p className="text-gray-500 mt-1">Manage your {biz.product_name_plural.toLowerCase()} inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchItems}
            className="border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/admin/inventory/new">
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 border-0 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Add {biz.product_name_singular}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder={`Search ${biz.product_name_plural.toLowerCase()}…`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-gray-800 rounded-xl"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-44 bg-white/5 border-gray-800 rounded-xl">
              <SelectValue placeholder={`All ${biz.category_label}s`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All {biz.category_label}s</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-40 bg-white/5 border-gray-800 rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All Status</SelectItem>
              {(((biz as unknown as Record<string, unknown>).inventory_statuses as string[]) || Object.keys(statusConfig)).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No {biz.product_name_plural.toLowerCase()} in inventory</h3>
            <p className="text-gray-500 mb-4">Add your first {biz.product_name_singular.toLowerCase()} to get started</p>
            <Link href="/admin/inventory/new">
              <Button className="btn-futuristic rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add {biz.product_name_singular}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">{biz.product_name_singular}</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">{biz.category_label}</th>
                  {biz.use_condition_grades && (
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Condition</th>
                  )}
                  {biz.use_battery_health && (
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Battery</th>
                  )}
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Price</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Cost</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Profit</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const price = item.selling_price;
                  const cost = item.cost_price;
                  const profit = price - cost;
                  const status = statusConfig[item.status] || { label: item.status, color: "bg-gray-500/20 text-gray-500" };

                  return (
                    <tr key={item.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden shrink-0">
                            {item.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">📦</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{item.model_name}</p>
                            <p className="text-xs text-gray-500">
                              {item.variant}{item.color ? ` • ${item.color}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400">{item.brand}</td>
                      {biz.use_condition_grades && (
                        <td className="p-4">
                          <Badge variant="outline" className="border-gray-700">
                            {conditionLabel(item.condition_grade)}
                          </Badge>
                        </td>
                      )}
                      {biz.use_battery_health && (
                        <td className="p-4 text-gray-400">
                          {item.battery_health_percent != null ? `${item.battery_health_percent}%` : "—"}
                        </td>
                      )}
                      <td className="p-4 font-semibold text-green-500">{formatPrice(price)}</td>
                      <td className="p-4 text-gray-400">{formatPrice(cost)}</td>
                      <td className="p-4">
                        <span className={profit > 0 ? "text-green-500" : "text-red-500"}>
                          {profit > 0 ? "+" : ""}{formatPrice(profit)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge className={`border-0 ${status.color}`}>{status.label}</Badge>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-lg">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/phones/${item.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/admin/inventory/${item.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              className="cursor-pointer text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
