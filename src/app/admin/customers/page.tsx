"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Users,
  Star,
  TrendingUp,
  ShoppingCart,
  Loader2,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  Settings2,
  Send,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatPrice, getWhatsAppLink } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
  custom_data?: Record<string, unknown>;
}

interface CustomField {
  id: string;
  table_name: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  required: boolean;
}

interface Stats {
  total: number;
  vip: number;
  active: number;
  new: number;
  avgOrderValue: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [importData, setImportData] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    status: "active",
  });
  const [newCustomerCustomData, setNewCustomerCustomData] = useState<Record<string, unknown>>({});
  const [editCustomer, setEditCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    status: "active",
  });
  const [editCustomerCustomData, setEditCustomerCustomData] = useState<Record<string, unknown>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Customer | null>(null); // null = bulk
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    vip: 0,
    active: 0,
    new: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    fetchCustomers();
    fetchCustomFields();
  }, [selectedStatus]);

  const fetchCustomFields = async () => {
    try {
      const response = await fetch("/api/custom-fields?table=customers");
      const data = await response.json();
      if (data.fields) {
        setCustomFields(data.fields);
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      
      const response = await fetch(`/api/customers?${params.toString()}`);
      const data = await response.json();
      
      if (data.customers) {
        setCustomers(data.customers);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (response.ok) {
        setCustomers(customers.filter(c => c.id !== id));
        setShowDeleteDialog(false);
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditCustomer({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      status: customer.status || "active",
    });
    setEditCustomerCustomData(customer.custom_data || {});
    setShowEditModal(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;
    if (!editCustomer.name || !editCustomer.phone) {
      alert("Name and phone are required!");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editCustomer, custom_data: editCustomerCustomData }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedCustomer(null);
        fetchCustomers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Name and phone are required!");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCustomer, custom_data: newCustomerCustomData }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewCustomer({ name: "", phone: "", email: "", status: "active" });
        setNewCustomerCustomData({});
        fetchCustomers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add customer");
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      alert("Failed to add customer");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importData) {
      alert("Please select a file to import");
      return;
    }

    try {
      setSaving(true);
      let customersToImport: any[] = [];

      // Read file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          customersToImport = XLSX.utils.sheet_to_json(sheet);

          if (!Array.isArray(customersToImport) || customersToImport.length === 0) {
            alert("Invalid data format or empty file.");
            setSaving(false);
            return;
          }

          // Normalize keys to lowercase
          customersToImport = customersToImport.map(c => {
            const newObj: any = {};
            Object.keys(c).forEach(key => {
              newObj[key.toLowerCase().trim()] = c[key];
            });
            return newObj;
          });

          const response = await fetch("/api/customers/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customers: customersToImport }),
          });

          const resData = await response.json();

          if (response.ok) {
            setShowImportModal(false);
            setImportData("");
            fetchCustomers();
            alert(resData.message || "Import successful");
          } else {
            alert(resData.error || "Failed to import customers");
          }
        } catch (err) {
          console.error("Error parsing file:", err);
          alert("Failed to parse file");
        } finally {
          setSaving(false);
        }
      };

      reader.readAsBinaryString(importData as any);

    } catch (error) {
      console.error("Error importing customers:", error);
      alert("Failed to import customers");
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) {
      alert("Subject and body are required!");
      return;
    }

    const recipients = emailTarget
      ? [emailTarget.email].filter(Boolean)
      : filteredCustomers.filter((c) => c.email).map((c) => c.email as string);

    if (recipients.length === 0) {
      alert("No email addresses found for selected customers.");
      return;
    }

    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          subject: emailForm.subject,
          body: emailForm.body,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setEmailResult({ sent: data.sent, failed: data.failed });
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailForm({ subject: "", body: "" });
          setEmailResult(null);
          setEmailTarget(null);
        }, 3000);
      }
    } catch (error) {
      console.error("Email error:", error);
      alert("Failed to send email");
    } finally {
      setEmailSending(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const statsData = [
    { label: "Total Customers", value: stats.total.toString(), icon: Users, color: "from-blue-500 to-cyan-600" },
    { label: "VIP Customers", value: stats.vip.toString(), icon: Star, color: "from-yellow-500 to-orange-600" },
    { label: "New This Month", value: stats.new.toString(), icon: UserPlus, color: "from-green-500 to-emerald-600" },
    { label: "Avg. Order Value", value: formatPrice(stats.avgOrderValue), icon: TrendingUp, color: "from-purple-500 to-pink-600" },
  ];

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer relationships</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={fetchCustomers}
            className="border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowImportModal(true)}
            className="border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button 
            variant="outline" 
            onClick={() => { setEmailTarget(null); setShowEmailModal(true); }}
            className="border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl"
          >
            <Mail className="w-4 h-4 mr-2" />
            Bulk Email
          </Button>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-orange-500 to-red-600 border-0 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
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
              placeholder="Search customers by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-gray-800 rounded-xl"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-40 bg-white/5 border-gray-800 rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
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
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No customers found</h3>
            <p className="text-gray-500">Add your first customer to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left p-4 font-medium text-gray-500 hidden md:table-cell">Contact</th>
                  <th className="text-left p-4 font-medium text-gray-500">Orders</th>
                  <th className="text-left p-4 font-medium text-gray-500 hidden lg:table-cell">Total Spent</th>
                  <th className="text-left p-4 font-medium text-gray-500">Status</th>
                  <th className="text-right p-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-gray-500">{getTimeAgo(customer.updated_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="space-y-1">
                        {customer.email && (
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </p>
                        )}
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold">{customer.total_orders}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell font-semibold text-green-500">
                      {formatPrice(customer.total_spent)}
                    </td>
                    <td className="p-4">
                      <Badge className={`border-0 ${
                        customer.status === 'vip' 
                          ? 'bg-yellow-500/20 text-yellow-500' 
                          : customer.status === 'new'
                          ? 'bg-blue-500/20 text-blue-500'
                          : customer.status === 'inactive'
                          ? 'bg-gray-500/20 text-gray-500'
                          : 'bg-green-500/20 text-green-500'
                      }`}>
                        {customer.status === 'vip' && <Star className="w-3 h-3 mr-1" />}
                        {(customer.status || 'active').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-lg">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                          <DropdownMenuItem 
                            onClick={() => openEditModal(customer)}
                            className="cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openEditModal(customer)}
                            className="cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <a href={getWhatsAppLink("91" + customer.phone.replace(/\D/g, "").slice(-10))} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                              WhatsApp
                            </a>
                          </DropdownMenuItem>
                          {customer.email && (
                            <DropdownMenuItem
                              onClick={() => { setEmailTarget(customer); setShowEmailModal(true); }}
                              className="cursor-pointer"
                            >
                              <Mail className="w-4 h-4 mr-2 text-blue-400" />
                              Send Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(customer)}
                            className="cursor-pointer text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="bg-[#111827] border-gray-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload a CSV or Excel file containing customer data.
              <br />
              <span className="text-xs text-gray-500">
                Supported formats: .csv, .xlsx, .xls
                <br />
                Required columns: Name, Phone
                <br />
                Optional columns: Email, City, Status
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select File</Label>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-[#1f2937] hover:bg-gray-700 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileSpreadsheet className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">CSV or Excel files</p>
                  </div>
                  <Input 
                    id="dropzone-file" 
                    type="file" 
                    className="hidden" 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={(e) => setImportData(e.target.files?.[0] as any)}
                  />
                </label>
              </div>
              {importData && (
                <div className="text-sm text-green-500 flex items-center mt-2">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Selected: {(importData as any).name}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowImportModal(false)} className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={saving || !importData} className="bg-orange-600 hover:bg-orange-700">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Customers"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your CRM
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Customer name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="bg-white/5 border-gray-800 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="bg-white/5 border-gray-800 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="bg-white/5 border-gray-800 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={newCustomer.status} 
                onValueChange={(value) => setNewCustomer({ ...newCustomer, status: value })}
              >
                <SelectTrigger className="bg-white/5 border-gray-800 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-4 border-t border-gray-800 pt-4">
                <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Custom Fields
                </h4>
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label>{field.field_label}</Label>
                    {field.field_type === "text" && (
                      <Input
                        value={(newCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setNewCustomerCustomData({ ...newCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                    {field.field_type === "number" && (
                      <Input
                        type="number"
                        value={(newCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setNewCustomerCustomData({ ...newCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                    {field.field_type === "date" && (
                      <Input
                        type="date"
                        value={(newCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setNewCustomerCustomData({ ...newCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                    {field.field_type === "boolean" && (
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={(newCustomerCustomData[field.field_name] as boolean) || false}
                          onCheckedChange={(checked) => setNewCustomerCustomData({ ...newCustomerCustomData, [field.field_name]: checked })}
                        />
                        <span className="text-gray-400 text-sm">{newCustomerCustomData[field.field_name] ? "Yes" : "No"}</span>
                      </div>
                    )}
                    {field.field_type === "select" && field.options && (
                      <Select 
                        value={(newCustomerCustomData[field.field_name] as string) || ""}
                        onValueChange={(value) => setNewCustomerCustomData({ ...newCustomerCustomData, [field.field_name]: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-gray-800 rounded-xl">
                          <SelectValue placeholder={`Select ${field.field_label}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.field_type === "textarea" && (
                      <Textarea
                        value={(newCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setNewCustomerCustomData({ ...newCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border-gray-700 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomer}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 border-0 rounded-xl cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Customer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Customer name"
                value={editCustomer.name}
                onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                className="bg-white/5 border-gray-800 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                placeholder="+91 98765 43210"
                value={editCustomer.phone}
                onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                className="bg-white/5 border-gray-800 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="customer@example.com"
                value={editCustomer.email}
                onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                className="bg-white/5 border-gray-800 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={editCustomer.status} 
                onValueChange={(value) => setEditCustomer({ ...editCustomer, status: value })}
              >
                <SelectTrigger className="bg-white/5 border-gray-800 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-4 border-t border-gray-800 pt-4">
                <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Custom Fields
                </h4>
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label>{field.field_label}</Label>
                    {field.field_type === "text" && (
                      <Input
                        value={(editCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setEditCustomerCustomData({ ...editCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                    {field.field_type === "number" && (
                      <Input
                        type="number"
                        value={(editCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setEditCustomerCustomData({ ...editCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                    {field.field_type === "date" && (
                      <Input
                        type="date"
                        value={(editCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setEditCustomerCustomData({ ...editCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                    {field.field_type === "boolean" && (
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={(editCustomerCustomData[field.field_name] as boolean) || false}
                          onCheckedChange={(checked) => setEditCustomerCustomData({ ...editCustomerCustomData, [field.field_name]: checked })}
                        />
                        <span className="text-gray-400 text-sm">{editCustomerCustomData[field.field_name] ? "Yes" : "No"}</span>
                      </div>
                    )}
                    {field.field_type === "select" && field.options && (
                      <Select 
                        value={(editCustomerCustomData[field.field_name] as string) || ""}
                        onValueChange={(value) => setEditCustomerCustomData({ ...editCustomerCustomData, [field.field_name]: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-gray-800 rounded-xl">
                          <SelectValue placeholder={`Select ${field.field_label}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.field_type === "textarea" && (
                      <Textarea
                        value={(editCustomerCustomData[field.field_name] as string) || ""}
                        onChange={(e) => setEditCustomerCustomData({ ...editCustomerCustomData, [field.field_name]: e.target.value })}
                        className="bg-white/5 border-gray-800 rounded-xl"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1 border-gray-700 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCustomer}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 border-0 rounded-xl cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Customer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Compose Modal */}
      <Dialog open={showEmailModal} onOpenChange={(o) => { setShowEmailModal(o); if (!o) { setEmailResult(null); setEmailTarget(null); } }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              {emailTarget ? `Email ${emailTarget.name}` : `Bulk Email (${filteredCustomers.filter(c => c.email).length} recipients)`}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {emailTarget
                ? `Sending to: ${emailTarget.email}`
                : `Sending to all customers with email addresses in the current view`}
            </DialogDescription>
          </DialogHeader>

          {emailResult ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
              <p className="text-xl font-bold text-green-400">
                {emailResult.sent} email{emailResult.sent !== 1 ? "s" : ""} sent!
              </p>
              {emailResult.failed > 0 && (
                <p className="text-sm text-red-400">{emailResult.failed} failed</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Subject *</Label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="e.g., Special offer just for you!"
                  className="mt-1 bg-gray-800 border-gray-700 rounded-xl"
                />
              </div>
              <div>
                <Label>Message *</Label>
                <textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  placeholder="Write your message here..."
                  rows={7}
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Plain text or basic HTML supported</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 border-gray-700 rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 border-0 rounded-xl"
                >
                  {emailSending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Send Email</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-white">{selectedCustomer?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 border-gray-700 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedCustomer && handleDelete(selectedCustomer.id)}
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 border-0 rounded-xl cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
