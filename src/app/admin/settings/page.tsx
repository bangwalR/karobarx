"use client";

import { useState, useEffect } from "react";
import {
  Store,
  Bell,
  MessageSquare,
  Shield,
  Save,
  Upload,
  Globe,
  MapPin,
  Phone,
  Clock,
  Instagram,
  Facebook,
  Twitter,
  Smartphone,
  Settings2,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  GripVertical,
  Check,
  X,
  Pencil,
  Lock,
  Users,
  UserPlus,
  Mail,
  MoreVertical,
  Palette,
  Building2,
  Layers,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CloudinaryUpload } from "@/components/cloudinary-upload";
import { useBusinessConfig, BusinessConfig } from "@/contexts/BusinessContext";
import { BUSINESS_TEMPLATES } from "@/lib/business-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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


interface Settings {
  store_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  open_time: string;
  close_time: string;
  instagram: string;
  facebook: string;
  twitter: string;
  whatsapp_number: string;
  welcome_message: string;
  ai_auto_reply: boolean;
  agent_name: string;
  response_language: string;
  suggest_alternatives: boolean;
  notify_new_order: boolean;
  notify_inquiry: boolean;
  notify_low_stock: boolean;
  notify_daily_summary: boolean;
  notify_marketing: boolean;
  two_factor_auth: boolean;
  login_alerts: boolean;
  session_timeout: boolean;
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

interface FieldConfig {
  id: string;
  table_name: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_system: boolean;
  is_visible: boolean;
  is_required: boolean;
  display_order: number;
  options: { label: string; value: string }[] | null;
  placeholder: string | null;
  section: string;
}

const defaultSettings: Settings = {
  store_name: "MobileHub Delhi",
  tagline: "Premium Second-Hand Phones in Delhi",
  description: "Delhi's most trusted destination for certified pre-owned smartphones. Quality guaranteed with warranty.",
  logo_url: "",
  phone: "+91 99107 24940",
  email: "contact@mobilehubdelhi.com",
  website: "https://mobilehubdelhi.com",
  address: "123 Mobile Market, Karol Bagh, New Delhi - 110005",
  open_time: "10:00 AM",
  close_time: "9:00 PM",
  instagram: "",
  facebook: "",
  twitter: "",
  whatsapp_number: "+91 99107 24940",
  welcome_message: "🙏 Namaste! Welcome to MobileHub Delhi. How can I help you find your perfect phone today?",
  ai_auto_reply: true,
  agent_name: "MobileHub Assistant",
  response_language: "Hindi + English (Hinglish)",
  suggest_alternatives: true,
  notify_new_order: true,
  notify_inquiry: true,
  notify_low_stock: true,
  notify_daily_summary: false,
  notify_marketing: false,
  two_factor_auth: false,
  login_alerts: true,
  session_timeout: true,
};

const tabs = [
  { id: "business", label: "Business Profile", icon: Building2 },
  { id: "store", label: "Store Info", icon: Store },
  { id: "team", label: "Team", icon: Users },
  { id: "profiles", label: "Profiles", icon: Layers },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "security", label: "Security", icon: Shield },
  { id: "custom-fields", label: "Custom Fields", icon: Settings2 },
];

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Dropdown" },
  { value: "textarea", label: "Long Text" },
];

const entityTypes = [
  { value: "phones", label: "Inventory", icon: "📱" },
  { value: "customers", label: "Customers", icon: "👥" },
  { value: "orders", label: "Orders", icon: "🛒" },
  { value: "inquiries", label: "Inquiries", icon: "💬" },
];

// Role configuration
const roleConfig: Record<string, { label: string; color: string; description: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-500/20 text-purple-400", description: "Full access" },
  admin: { label: "Admin", color: "bg-blue-500/20 text-blue-400", description: "All except user management" },
  manager: { label: "Manager", color: "bg-green-500/20 text-green-400", description: "Manage store operations" },
  staff: { label: "Staff", color: "bg-gray-500/20 text-gray-400", description: "View only access" },
};

// Team User interface
interface TeamUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  permissions: Record<string, Record<string, boolean>>;
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
}

// TeamManagement Component
function TeamManagement() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "staff",
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      full_name: "",
      phone: "",
      role: "staff",
      is_active: true,
    });
  };

  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.full_name) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("User added successfully");
        setShowAddModal(false);
        resetForm();
        fetchUsers();
      }
    } catch {
      toast.error("Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
        is_active: formData.is_active,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("User updated successfully");
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      }
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: TeamUser) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(user.is_active ? "User deactivated" : "User activated");
        fetchUsers();
      }
    } catch {
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (user: TeamUser) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name}?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("User deleted");
        fetchUsers();
      }
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const openEditModal = (user: TeamUser) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.role,
      is_active: user.is_active,
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="glass-card rounded-2xl p-6 flex-1">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-orange-500" />
            Team Members
          </h2>
          <p className="text-sm text-gray-400">Manage users and their access permissions</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="ml-4 bg-orange-500 hover:bg-orange-600"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Users List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
            <p className="text-gray-400 mb-4">Add your first team member to get started</p>
            <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {users.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                <div className="flex items-center gap-4">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-semibold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.full_name}</p>
                      <Badge className={`border-0 text-xs ${roleConfig[user.role]?.color}`}>
                        {roleConfig[user.role]?.label || user.role}
                      </Badge>
                      {!user.is_active && (
                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>@{user.username}</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-gray-500">
                    {user.last_login_at ? (
                      <>Last login: {new Date(user.last_login_at).toLocaleDateString()}</>
                    ) : (
                      "Never logged in"
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditModal(user)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                        {user.is_active ? (
                          <><EyeOff className="w-4 h-4 mr-2" /> Deactivate</>
                        ) : (
                          <><Eye className="w-4 h-4 mr-2" /> Activate</>
                        )}
                      </DropdownMenuItem>
                      {user.role !== "super_admin" && (
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="glass-card border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                  className="mt-1 bg-gray-900 border-gray-700"
                />
              </div>
              <div>
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="mt-1 bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="glass-card border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1 bg-gray-900 border-gray-700"
                />
              </div>
              <div>
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="mt-1 bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div>
              <Label>New Password (leave blank to keep current)</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 bg-gray-900 border-gray-700"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <p className="font-medium">Active Status</p>
                <p className="text-sm text-gray-500">User can login when active</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1 border-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfilesTab component
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileSummaryItem {
  id: string;
  business_type: string;
  display_name?: string;
  product_name_plural: string;
  order_prefix: string;
  setup_completed: boolean;
  created_at: string;
}

function ProfilesTab({
  profiles,
  activeProfileId,
  onSwitch,
  onCreateNew,
}: {
  profiles: ProfileSummaryItem[];
  activeProfileId?: string;
  onSwitch: (id: string) => Promise<void>;
  onCreateNew: () => void;
}) {
  const [switching, setSwitching] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSwitch = async (id: string) => {
    if (id === activeProfileId) return;
    setSwitching(id);
    try {
      await onSwitch(id);
      toast.success("Switched profile");
    } catch {
      toast.error("Failed to switch profile");
    } finally {
      setSwitching(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (profiles.length <= 1) {
      toast.error("Cannot delete the only profile");
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Profile deleted");
      // if deleted the active one, switch to first remaining
      if (id === activeProfileId) {
        const remaining = profiles.find((p) => p.id !== id);
        if (remaining) await onSwitch(remaining.id);
      } else {
        window.location.reload();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              Business Profiles
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Each profile is a completely isolated data silo — separate inventory, orders, customers and settings.
            </p>
          </div>
          <Button
            onClick={onCreateNew}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Profile
          </Button>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No profiles found.</div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              return (
                <div
                  key={profile.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isActive
                      ? "border-orange-500/50 bg-orange-500/8"
                      : "border-gray-800 bg-white/3 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold border ${
                        isActive ? "border-orange-500/40 bg-orange-500/15 text-orange-400" : "border-gray-700 bg-white/5 text-gray-400"
                      }`}
                    >
                      {profile.business_type?.charAt(0).toUpperCase() ?? "B"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {profile.display_name || profile.product_name_plural}
                        </span>
                        {isActive && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                            Active
                          </Badge>
                        )}
                        {!profile.setup_completed && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            Setup incomplete
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 capitalize">{profile.business_type?.replace(/_/g, " ")}</span>
                        <span className="text-gray-700">·</span>
                        <span className="text-xs text-gray-500">{profile.product_name_plural}</span>
                        <span className="text-gray-700">·</span>
                        <span className="text-xs text-gray-500">Prefix: {profile.order_prefix}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 hover:border-orange-500/50 text-gray-300 hover:text-orange-400 text-xs gap-1.5"
                        onClick={() => handleSwitch(profile.id)}
                        disabled={switching === profile.id}
                      >
                        {switching === profile.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        Switch
                      </Button>
                    )}

                    {/* Delete — only if >1 profile and not active */}
                    {profiles.length > 1 && !isActive && (
                      confirmDelete === profile.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs h-8 px-2"
                            onClick={() => handleDelete(profile.id)}
                            disabled={deletingId === profile.id}
                          >
                            {deletingId === profile.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 h-8 px-2"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-red-400 h-8 px-2"
                          onClick={() => setConfirmDelete(profile.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-400" />
          About profiles
        </h3>
        <ul className="text-xs text-gray-400 space-y-1.5">
          <li>• Each profile has its own <strong className="text-gray-300">inventory, orders, customers, inquiries and custom fields</strong>.</li>
          <li>• Switching profiles changes which data you see across the entire CRM.</li>
          <li>• Creating a new profile will launch the setup wizard.</li>
          <li>• Profiles share the same login credentials — manage team access from the <strong className="text-gray-300">Team</strong> tab.</li>
        </ul>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Business config state
  const { config: bizConfig, updateConfig: updateBizConfig, refreshConfig, profiles, switchProfile } = useBusinessConfig();
  const [bizState, setBizState] = useState<Partial<BusinessConfig>>({});
  const [savingBiz, setSavingBiz] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("phones");
  const [loadingFields, setLoadingFields] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [addingField, setAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState("");

  // Instagram connection state
  const [igStatus, setIgStatus] = useState<{
    connected: boolean; expired?: boolean; username?: string; expiresAt?: string;
  } | null>(null);
  const [igLoading, setIgLoading] = useState(false);

  // Facebook Messenger connection state
  const [fbStatus, setFbStatus] = useState<{
    connected: boolean; pageName?: string; pageId?: string; expiresAt?: string;
  } | null>(null);
  const [fbLoading, setFbLoading] = useState(false);

  // Sync bizState from context
  useEffect(() => {
    setBizState(bizConfig);
  }, [bizConfig]);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Load custom fields when entity changes
  useEffect(() => {
    if (activeTab === "custom-fields") {
      fetchCustomFields();
      fetchFieldConfigs();
    }
  }, [activeTab, selectedEntity]);

  // Load Instagram + Facebook status when integrations tab is active
  useEffect(() => {
    if (activeTab !== "integrations") return;

    // Instagram
    setIgLoading(true);
    fetch("/api/social/instagram/status")
      .then((r) => r.json())
      .then((d) => setIgStatus(d))
      .catch(() => setIgStatus({ connected: false }))
      .finally(() => setIgLoading(false));

    // Facebook
    setFbLoading(true);
    fetch("/api/social/facebook/status")
      .then((r) => r.json())
      .then((d) => setFbStatus(d))
      .catch(() => setFbStatus({ connected: false }))
      .finally(() => setFbLoading(false));

    // Handle OAuth redirect result params
    const params = new URLSearchParams(window.location.search);
    if (params.get("ig_success")) {
      toast.success(`Instagram connected as @${params.get("ig_user") || "account"}`);
      window.history.replaceState({}, "", "/admin/settings?tab=integrations");
    } else if (params.get("ig_error")) {
      toast.error(`Instagram error: ${params.get("ig_error")}`);
      window.history.replaceState({}, "", "/admin/settings?tab=integrations");
    } else if (params.get("fb_success")) {
      toast.success(`Facebook connected — Page: ${params.get("fb_page") || "page"}`);
      window.history.replaceState({}, "", "/admin/settings?tab=integrations");
    } else if (params.get("fb_error")) {
      toast.error(`Facebook error: ${params.get("fb_error")}`);
      window.history.replaceState({}, "", "/admin/settings?tab=integrations");
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings");
      const result = await response.json();
      
      if (result.success && result.settings) {
        setSettings({ ...defaultSettings, ...result.settings });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      setLoadingFields(true);
      const response = await fetch(`/api/custom-fields?table=${selectedEntity}`);
      const result = await response.json();
      
      if (result.success) {
        setCustomFields(result.fields || []);
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchFieldConfigs = async () => {
    try {
      const response = await fetch(`/api/field-config?table=${selectedEntity}`);
      const result = await response.json();
      
      if (result.success) {
        setFieldConfigs(result.fields || []);
      }
    } catch (error) {
      console.error("Error fetching field configs:", error);
    }
  };

  const toggleFieldVisibility = async (field: FieldConfig) => {
    const updatedField = { ...field, is_visible: !field.is_visible };
    setFieldConfigs(prev => prev.map(f => f.id === field.id ? updatedField : f));
  };

  const toggleFieldRequired = async (field: FieldConfig) => {
    const updatedField = { ...field, is_required: !field.is_required };
    setFieldConfigs(prev => prev.map(f => f.id === field.id ? updatedField : f));
  };

  const updateFieldLabel = async (field: FieldConfig, newLabel: string) => {
    const updatedField = { ...field, field_label: newLabel };
    setFieldConfigs(prev => prev.map(f => f.id === field.id ? updatedField : f));
    setEditingFieldId(null);
    setEditingFieldLabel("");
  };

  const saveFieldConfigs = async () => {
    try {
      setSavingFields(true);
      const response = await fetch("/api/field-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fieldConfigs }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Field configuration saved!");
      } else {
        toast.error(result.error || "Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving field configs:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSavingFields(false);
    }
  };

  const moveField = (field: FieldConfig, direction: 'up' | 'down') => {
    const sorted = [...fieldConfigs].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sorted.findIndex(f => f.id === field.id);
    
    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous
      const prevField = sorted[currentIndex - 1];
      setFieldConfigs(prev => prev.map(f => {
        if (f.id === field.id) return { ...f, display_order: prevField.display_order };
        if (f.id === prevField.id) return { ...f, display_order: field.display_order };
        return f;
      }));
    } else if (direction === 'down' && currentIndex < sorted.length - 1) {
      // Swap with next
      const nextField = sorted[currentIndex + 1];
      setFieldConfigs(prev => prev.map(f => {
        if (f.id === field.id) return { ...f, display_order: nextField.display_order };
        if (f.id === nextField.id) return { ...f, display_order: field.display_order };
        return f;
      }));
    }
  };

  const addNewFieldToConfig = async () => {
    if (!newFieldName.trim()) {
      toast.error("Field name is required");
      return;
    }
    
    try {
      setAddingField(true);
      const fieldName = newFieldName.toLowerCase().replace(/\s+/g, "_");
      const maxOrder = fieldConfigs.reduce((max, f) => Math.max(max, f.display_order), 0);
      
      const response = await fetch("/api/field-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_name: selectedEntity,
          field_name: fieldName,
          field_label: newFieldName,
          field_type: newFieldType,
          is_system: false,
          is_visible: true,
          is_required: false,
          display_order: maxOrder + 1,
          options: newFieldType === "select" ? newFieldOptions.split(",").map(o => ({ label: o.trim(), value: o.trim().toLowerCase().replace(/\s+/g, "_") })) : null,
          section: "custom",
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Custom field added!");
        setNewFieldName("");
        setNewFieldType("text");
        setNewFieldOptions("");
        fetchFieldConfigs();
      } else {
        toast.error(result.error || "Failed to add field");
      }
    } catch (error) {
      console.error("Error adding field:", error);
      toast.error("Failed to add field");
    } finally {
      setAddingField(false);
    }
  };

  const deleteFieldConfig = async (field: FieldConfig) => {
    if (field.is_system) {
      toast.error("System fields cannot be deleted. You can hide them instead.");
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${field.field_label}"? This action cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/field-config?id=${field.id}`, {
        method: "DELETE",
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Field deleted!");
        fetchFieldConfigs();
      } else {
        toast.error(result.error || "Failed to delete field");
      }
    } catch (error) {
      console.error("Error deleting field:", error);
      toast.error("Failed to delete field");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Settings saved successfully!");
        // Refresh the BusinessContext so the sidebar logo/name updates immediately
        await refreshConfig();
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    try {
      setChangingPassword(true);
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddCustomField = async () => {
    if (!newFieldName.trim()) {
      toast.error("Field name is required");
      return;
    }
    
    try {
      setAddingField(true);
      const response = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_name: selectedEntity,
          field_name: newFieldName.toLowerCase().replace(/\s+/g, "_"),
          field_label: newFieldName,
          field_type: newFieldType,
          options: newFieldType === "select" ? newFieldOptions.split(",").map(o => o.trim()).filter(Boolean) : null,
          required: false,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Custom field added!");
        setNewFieldName("");
        setNewFieldType("text");
        setNewFieldOptions("");
        fetchCustomFields();
      } else {
        toast.error(result.error || "Failed to add field");
      }
    } catch (error) {
      console.error("Error adding field:", error);
      toast.error("Failed to add field");
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;
    
    try {
      const response = await fetch(`/api/custom-fields?id=${fieldId}`, {
        method: "DELETE",
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Field deleted!");
        fetchCustomFields();
      } else {
        toast.error(result.error || "Failed to delete field");
      }
    } catch (error) {
      console.error("Error deleting field:", error);
      toast.error("Failed to delete field");
    }
  };

  const updateSetting = (key: keyof Settings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your store settings and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="btn-futuristic rounded-xl">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card rounded-2xl p-2 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Business Profile Tab */}
      {activeTab === "business" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-orange-500" />
              Business Profile
            </h2>
            <p className="text-sm text-gray-400">
              Choose your business type and customise the terminology used throughout the CRM and public website.
            </p>
          </div>

          {/* Template Selector */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-1">Business Type</h3>
            <p className="text-sm text-gray-400 mb-4">
              Switching templates will update all default labels. Your custom data is never deleted.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {BUSINESS_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setBizState((prev) => ({
                      ...prev,
                      business_type: t.id,
                      product_name_singular: t.product_name_singular,
                      product_name_plural: t.product_name_plural,
                      identifier_label: t.identifier_label,
                      identifier_2_label: t.identifier_2_label,
                      identifier_required: t.identifier_required,
                      identifier_unique: t.identifier_unique,
                      category_label: t.category_label,
                      subcategory_label: t.subcategory_label,
                      variant_label: t.variant_label,
                      seller_label: t.seller_label,
                      use_condition_grades: t.use_condition_grades,
                      condition_labels: t.condition_labels,
                      use_battery_health: t.use_battery_health,
                      use_functional_tests: t.use_functional_tests,
                      enable_imei_check: t.enable_imei_check,
                      primary_categories: t.primary_categories,
                      whatsapp_cta_label: t.whatsapp_cta_label,
                      whatsapp_inquiry_template: t.whatsapp_inquiry_template,
                      order_prefix: t.order_prefix,
                      gst_enabled: t.gst_enabled,
                      gst_rate: t.gst_rate,
                      gst_label: t.gst_label,
                      enable_leads_module: t.enable_leads_module,
                      enable_marketing_module: t.enable_marketing_module,
                      enable_seller_tracking: t.enable_seller_tracking,
                      enable_whatsapp_ai: t.enable_whatsapp_ai,
                    }));
                  }}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((bizState as any).business_type || (bizConfig as any).business_type) === t.id
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-gray-800 bg-white/3 hover:border-gray-600"
                  }`}
                >
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <div className="text-sm font-medium">{t.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Terminology */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Product Terminology</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                ["product_name_singular", "Product name (singular)", "e.g. Phone, Laptop, Item"],
                ["product_name_plural",   "Product name (plural)",   "e.g. Phones, Laptops, Items"],
                ["category_label",        "Primary category label",   "e.g. Brand, Category, Make"],
                ["subcategory_label",     "Secondary category label", "e.g. Model, Style, Type"],
                ["variant_label",         "Variant label",            "e.g. Storage/RAM, Size/Colour"],
                ["seller_label",          "Seller / supplier label",  "e.g. Seller, Supplier, Owner"],
                ["identifier_label",      "Unique identifier label",  "e.g. IMEI, Serial No., SKU"],
                ["identifier_2_label",    "Secondary ID label",       "e.g. IMEI 2, Barcode"],
                ["order_prefix",          "Order number prefix",      "e.g. MH → MH2602XXXX"],
              ] as [keyof BusinessConfig, string, string][]).map(([key, label, placeholder]) => (
                <div key={key}>
                  <Label className="text-xs text-gray-400">{label}</Label>
                  <Input
                    value={(bizState[key] as string) ?? ""}
                    onChange={(e) => setBizState((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1 bg-white/5 border-gray-800 rounded-xl text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Feature Flags */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Features</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                ["use_condition_grades",      "Show condition grades (A+ to D)"],
                ["use_battery_health",        "Show battery health %"],
                ["use_functional_tests",      "Show functional test checklist"],
                ["enable_imei_check",         "Enable IMEI / blacklist check"],
                ["enable_leads_module",       "Enable Leads module"],
                ["enable_marketing_module",   "Enable Marketing / Campaigns module"],
                ["enable_seller_tracking",    "Enable Seller / Supplier tracking"],
                ["enable_whatsapp_ai",        "Enable WhatsApp AI auto-reply"],
                ["gst_enabled",               "Enable GST / Tax on invoices"],
              ] as [keyof BusinessConfig, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-white/3 rounded-xl">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={!!(bizState[key] ?? bizConfig[key])}
                    onCheckedChange={(v) => setBizState((p) => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* GST rate */}
          {(bizState.gst_enabled ?? bizConfig.gst_enabled) && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Tax / GST Settings</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-400">Tax label</Label>
                  <Input
                    value={(bizState.gst_label as string) ?? bizConfig.gst_label}
                    onChange={(e) => setBizState((p) => ({ ...p, gst_label: e.target.value }))}
                    placeholder="GST"
                    className="mt-1 bg-white/5 border-gray-800 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    value={(bizState.gst_rate as number) ?? bizConfig.gst_rate}
                    onChange={(e) => setBizState((p) => ({ ...p, gst_rate: parseFloat(e.target.value) }))}
                    placeholder="18"
                    className="mt-1 bg-white/5 border-gray-800 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Primary Categories */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-1">Primary Categories</h3>
            <p className="text-sm text-gray-400 mb-4">
              These appear as filter options and quick-select chips. Enter one per line.
            </p>
            <textarea
              value={((bizState.primary_categories ?? bizConfig.primary_categories) as string[]).join("\n")}
              onChange={(e) =>
                setBizState((p) => ({
                  ...p,
                  primary_categories: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                }))
              }
              rows={6}
              className="w-full bg-white/5 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-orange-500/50"
              placeholder={"Apple\nSamsung\nOnePlus\n..."}
            />
          </div>

          {/* WhatsApp inquiry template */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-1">WhatsApp Inquiry Template</h3>
            <p className="text-sm text-gray-400 mb-4">
              Variables: <code className="text-orange-400">{"{{category}}"}</code>, <code className="text-orange-400">{"{{subcategory}}"}</code>, <code className="text-orange-400">{"{{variant}}"}</code>, <code className="text-orange-400">{"{{price}}"}</code>
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Button label</Label>
                <Input
                  value={(bizState.whatsapp_cta_label as string) ?? bizConfig.whatsapp_cta_label}
                  onChange={(e) => setBizState((p) => ({ ...p, whatsapp_cta_label: e.target.value }))}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Message template</Label>
                <textarea
                  value={(bizState.whatsapp_inquiry_template as string) ?? bizConfig.whatsapp_inquiry_template}
                  onChange={(e) => setBizState((p) => ({ ...p, whatsapp_inquiry_template: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 bg-white/5 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>
          </div>

          {/* Hero Stats */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Public Website Hero Stats</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {([1, 2, 3, 4] as const).map((n) => (
                <div key={n} className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-400">Stat {n} value</Label>
                    <Input
                      value={(bizState[`hero_stat_${n}_value` as keyof BusinessConfig] as string) ?? ""}
                      onChange={(e) => setBizState((p) => ({ ...p, [`hero_stat_${n}_value`]: e.target.value }))}
                      placeholder="e.g. 15,000+"
                      className="mt-1 bg-white/5 border-gray-800 rounded-xl"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-400">Stat {n} label</Label>
                    <Input
                      value={(bizState[`hero_stat_${n}_label` as keyof BusinessConfig] as string) ?? ""}
                      onChange={(e) => setBizState((p) => ({ ...p, [`hero_stat_${n}_label`]: e.target.value }))}
                      placeholder="e.g. Phones Sold"
                      className="mt-1 bg-white/5 border-gray-800 rounded-xl"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                setSavingBiz(true);
                const ok = await updateBizConfig(bizState);
                if (ok) {
                  toast.success("Business profile saved!");
                  await refreshConfig();
                } else {
                  toast.error("Failed to save business profile");
                }
                setSavingBiz(false);
              }}
              disabled={savingBiz}
              className="btn-futuristic rounded-xl"
            >
              {savingBiz ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Business Profile</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Store Info Tab */}
      {activeTab === "store" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-500" />
              Store Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-sm">Store Name</Label>
                <Input 
                  value={settings.store_name} 
                  onChange={(e) => updateSetting("store_name", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Tagline</Label>
                <Input 
                  value={settings.tagline}
                  onChange={(e) => updateSetting("tagline", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Description</Label>
                <Textarea 
                  value={settings.description}
                  onChange={(e) => updateSetting("description", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-500" />
              Store Branding
            </h2>
            
            <div className="flex items-center gap-6">
              {settings.logo_url ? (
                <div className="relative">
                  <img 
                    src={settings.logo_url} 
                    alt="Store Logo" 
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                  <button
                    onClick={() => updateSetting("logo_url", "")}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-3xl font-bold">
                  {settings.store_name.charAt(0)}
                </div>
              )}
              <div>
                <CloudinaryUpload
                  onUpload={(urls) => {
                    if (urls.length > 0) {
                      updateSetting("logo_url", urls[0]);
                      toast.success("Logo uploaded successfully");
                    }
                  }}
                  folder="mobilehub-delhi/branding"
                  multiple={false}
                  maxFiles={1}
                />
                <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB. Recommended: 200x200px</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-500" />
              Contact Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-sm">Phone Number</Label>
                <Input 
                  value={settings.phone}
                  onChange={(e) => updateSetting("phone", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Email Address</Label>
                <Input 
                  value={settings.email}
                  onChange={(e) => updateSetting("email", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Website</Label>
                <Input 
                  value={settings.website}
                  onChange={(e) => updateSetting("website", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              Store Location
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-sm">Address</Label>
                <Textarea 
                  value={settings.address}
                  onChange={(e) => updateSetting("address", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-sm">Open Time</Label>
                  <Input 
                    value={settings.open_time}
                    onChange={(e) => updateSetting("open_time", e.target.value)}
                    className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Close Time</Label>
                  <Input 
                    value={settings.close_time}
                    onChange={(e) => updateSetting("close_time", e.target.value)}
                    className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="glass-card rounded-2xl p-6 space-y-6 lg:col-span-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              Social Media
            </h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-400 text-sm flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> Instagram
                </Label>
                <Input 
                  value={settings.instagram}
                  onChange={(e) => updateSetting("instagram", e.target.value)}
                  placeholder="@mobilehubdelhi" 
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm flex items-center gap-2">
                  <Facebook className="w-4 h-4" /> Facebook
                </Label>
                <Input 
                  value={settings.facebook}
                  onChange={(e) => updateSetting("facebook", e.target.value)}
                  placeholder="MobileHub Delhi" 
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm flex items-center gap-2">
                  <Twitter className="w-4 h-4" /> Twitter
                </Label>
                <Input 
                  value={settings.twitter}
                  onChange={(e) => updateSetting("twitter", e.target.value)}
                  placeholder="@mobilehubdelhi" 
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <TeamManagement />
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            Notification Preferences
          </h2>
          
          <div className="space-y-4">
            {[
              { key: "notify_new_order", title: "New Order Alerts", desc: "Get notified when a new order is placed" },
              { key: "notify_inquiry", title: "Inquiry Notifications", desc: "Receive alerts for new customer inquiries" },
              { key: "notify_low_stock", title: "Low Stock Alerts", desc: "Get notified when inventory is running low" },
              { key: "notify_daily_summary", title: "Daily Summary", desc: "Receive a daily summary of sales and activity" },
              { key: "notify_marketing", title: "Marketing Updates", desc: "Tips and updates to grow your business" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <Switch 
                  checked={settings[item.key as keyof Settings] as boolean}
                  onCheckedChange={(checked) => updateSetting(item.key as keyof Settings, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Tab */}
      {activeTab === "whatsapp" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              WhatsApp Business
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-sm">WhatsApp Number</Label>
                <Input 
                  value={settings.whatsapp_number}
                  onChange={(e) => updateSetting("whatsapp_number", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Welcome Message</Label>
                <Textarea 
                  value={settings.welcome_message}
                  onChange={(e) => updateSetting("welcome_message", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl min-h-[100px]"
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="font-medium">AI Auto-Reply</p>
                  <p className="text-sm text-gray-500">Let AI handle initial customer queries</p>
                </div>
                <Switch 
                  checked={settings.ai_auto_reply}
                  onCheckedChange={(checked) => updateSetting("ai_auto_reply", checked)}
                />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-500" />
              AI Agent Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-sm">Agent Name</Label>
                <Input 
                  value={settings.agent_name}
                  onChange={(e) => updateSetting("agent_name", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Response Language</Label>
                <Input 
                  value={settings.response_language}
                  onChange={(e) => updateSetting("response_language", e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="font-medium">Suggest Alternatives</p>
                  <p className="text-sm text-gray-500">Suggest similar phones when item unavailable</p>
                </div>
                <Switch 
                  checked={settings.suggest_alternatives}
                  onCheckedChange={(checked) => updateSetting("suggest_alternatives", checked)}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Status */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 bg-gradient-to-r from-green-500/10 to-emerald-600/10 border-green-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-500">WhatsApp Connected</p>
                <p className="text-sm text-gray-400">Your WhatsApp Business account is active and receiving messages</p>
              </div>
              <Button variant="outline" className="border-green-500/50 text-green-500 hover:bg-green-500/10 rounded-xl">
                Test Connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Change Password
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-sm">Current Password</Label>
                <div className="relative mt-1">
                  <Input 
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-white/5 border-gray-800 rounded-xl pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-sm">New Password</Label>
                <div className="relative mt-1">
                  <Input 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white/5 border-gray-800 rounded-xl pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Confirm New Password</Label>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
              </div>
              <Button 
                onClick={handlePasswordChange}
                disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full btn-futuristic rounded-xl"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Security Settings
            </h2>
            
            <div className="space-y-4">
              {[
                { key: "two_factor_auth", title: "Two-Factor Authentication", desc: "Add an extra layer of security" },
                { key: "login_alerts", title: "Login Alerts", desc: "Get notified of new login attempts" },
                { key: "session_timeout", title: "Session Timeout", desc: "Auto logout after 30 minutes of inactivity" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <Switch 
                    checked={settings[item.key as keyof Settings] as boolean}
                    onCheckedChange={(checked) => updateSetting(item.key as keyof Settings, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Active Sessions</h2>
            
            <div className="space-y-4">
              {[
                { device: "MacBook Pro", location: "New Delhi, India", time: "Current session", current: true },
                { device: "iPhone 15", location: "New Delhi, India", time: "2 hours ago", current: false },
              ].map((session, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      💻
                    </div>
                    <div>
                      <p className="font-medium">{session.device}</p>
                      <p className="text-sm text-gray-500">{session.location} • {session.time}</p>
                    </div>
                  </div>
                  {session.current ? (
                    <Badge className="bg-green-500/20 text-green-500 border-0">Current</Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="border-gray-800 text-red-500 hover:bg-red-500/10 rounded-lg">
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Instagram Integration */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-500" />
              Instagram DMs
            </h2>

            {/* Connection status row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <div>
                  {igLoading ? (
                    <p className="text-sm text-gray-400">Checking…</p>
                  ) : igStatus?.connected ? (
                    <>
                      <p className="font-medium text-green-400 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Connected
                      </p>
                      <p className="text-sm text-gray-400">@{igStatus.username}</p>
                      {igStatus.expiresAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Token expires {new Date(igStatus.expiresAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Instagram Business</p>
                      <p className="text-sm text-gray-500">Connect to read &amp; reply to DMs</p>
                    </>
                  )}
                </div>
              </div>

              {igStatus?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 shrink-0"
                  onClick={async () => {
                    await fetch("/api/social/instagram/status", { method: "DELETE" });
                    setIgStatus({ connected: false });
                    toast.success("Instagram disconnected");
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10 shrink-0"
                  disabled={igLoading}
                  onClick={() => { window.location.href = "/api/social/instagram/connect"; }}
                >
                  Connect Instagram
                </Button>
              )}
            </div>

            {/* Setup instructions when not connected */}
            {!igStatus?.connected && !igLoading && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-gray-400 space-y-2">
                <p className="font-medium text-amber-400">Setup required before connecting</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <span className="text-violet-400">developers.facebook.com</span> → Create App → Business type</li>
                  <li>Add the Instagram product and set Redirect URI to:<br />
                    <code className="bg-white/10 px-1 rounded break-all">
                      {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/social/instagram/callback
                    </code>
                  </li>
                  <li>Add to <code className="bg-white/10 px-1 rounded">.env.local</code>:
                    <code className="block bg-white/10 px-2 py-1 rounded mt-1">META_APP_ID=...<br />META_APP_SECRET=...</code>
                  </li>
                  <li>Restart the dev server, then click Connect Instagram</li>
                </ol>
              </div>
            )}

            {/* Features list when connected */}
            {igStatus?.connected && (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  View all DMs in the Conversations page
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  Reply to messages directly from dashboard
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  Real-time new message webhook
                </li>
              </ul>
            )}
          </div>

          {/* Facebook Messenger Integration */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-500" />
              Facebook Messenger
            </h2>

            {/* Connection status row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                  <Facebook className="w-6 h-6 text-white" />
                </div>
                <div>
                  {fbLoading ? (
                    <p className="text-sm text-gray-400">Checking…</p>
                  ) : fbStatus?.connected ? (
                    <>
                      <p className="font-medium text-green-400 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Connected
                      </p>
                      <p className="text-sm text-gray-400">{fbStatus.pageName}</p>
                      {fbStatus.expiresAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Token expires {new Date(fbStatus.expiresAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Facebook Page</p>
                      <p className="text-sm text-gray-500">Connect to read &amp; reply to Messenger DMs</p>
                    </>
                  )}
                </div>
              </div>

              {fbStatus?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 shrink-0"
                  onClick={async () => {
                    await fetch("/api/social/facebook/status", { method: "DELETE" });
                    setFbStatus({ connected: false });
                    toast.success("Facebook disconnected");
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 shrink-0"
                  disabled={fbLoading}
                  onClick={() => { window.location.href = "/api/social/facebook/connect"; }}
                >
                  Connect Facebook
                </Button>
              )}
            </div>

            {/* Setup instructions when not connected */}
            {!fbStatus?.connected && !fbLoading && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-gray-400 space-y-2">
                <p className="font-medium text-amber-400">Setup required before connecting</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <span className="text-violet-400">developers.facebook.com</span> → your App → add <strong>Messenger</strong> product</li>
                  <li>Under Messenger → Settings → add your Facebook Page</li>
                  <li>Set Redirect URI to:<br />
                    <code className="bg-white/10 px-1 rounded break-all">
                      {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/social/facebook/callback
                    </code>
                  </li>
                  <li>Set Webhook URL to:<br />
                    <code className="bg-white/10 px-1 rounded break-all">
                      {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/webhook/meta
                    </code>
                    &nbsp;with verify token <code className="bg-white/10 px-1 rounded">mobilehub_verify_2026</code>
                  </li>
                  <li>The same <code className="bg-white/10 px-1 rounded">META_APP_ID</code> / <code className="bg-white/10 px-1 rounded">META_APP_SECRET</code> env vars are reused — no new secrets needed</li>
                </ol>
              </div>
            )}

            {/* Features when connected */}
            {fbStatus?.connected && (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  View all Messenger conversations in Conversations page
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  Reply to Messenger messages directly from dashboard
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  Capture leads from Facebook Lead Ads via webhook
                </li>
              </ul>
            )}
          </div>

          {/* Webhook Configuration */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              Webhook Configuration
            </h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Configure these webhooks in your Meta Developer Console to receive real-time leads and messages.
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/5 border border-gray-800">
                  <Label className="text-gray-400 text-xs">Meta Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/instagram`}
                      readOnly
                      className="bg-gray-900 border-gray-700 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhook/instagram`);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-gray-800">
                  <Label className="text-gray-400 text-xs">Verify Token</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value="mobilehub_verify_token"
                      readOnly
                      className="bg-gray-900 border-gray-700 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700"
                      onClick={() => {
                        navigator.clipboard.writeText("mobilehub_verify_token");
                        toast.success("Copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Set this as META_WEBHOOK_VERIFY_TOKEN in your environment variables
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400">Setup Instructions</p>
                    <ol className="text-sm text-gray-400 mt-2 space-y-1 list-decimal list-inside">
                      <li>Create a Meta Developer App at developers.facebook.com</li>
                      <li>Add Instagram Graph API and Messenger products</li>
                      <li>Configure the webhook URL with the verify token above</li>
                      <li>Subscribe to leads, messages, and feed webhooks</li>
                      <li>Connect your Instagram Business Account and Facebook Page</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profiles Tab */}
      {activeTab === "profiles" && (
        <ProfilesTab
          profiles={profiles}
          activeProfileId={bizConfig.id}
          onSwitch={async (id) => {
            await switchProfile(id);
          }}
          onCreateNew={() => router.push("/admin/setup?new=1")}
        />
      )}

      {/* Custom Fields Tab */}
      {activeTab === "custom-fields" && (
        <div className="space-y-6">
          {/* Entity Selector Cards */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-orange-500" />
              Select Entity to Configure
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {entityTypes.map((entity) => (
                <button
                  key={entity.value}
                  onClick={() => setSelectedEntity(entity.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                    selectedEntity === entity.value
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl">{entity.icon}</span>
                  <span className="font-medium">{entity.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Field List - Takes 2 columns */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {entityTypes.find(e => e.value === selectedEntity)?.label} Form Fields
                </h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { fetchFieldConfigs(); fetchCustomFields(); }}
                    className="text-gray-400 hover:text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingFields ? "animate-spin" : ""}`} />
                  </Button>
                  <Button 
                    onClick={saveFieldConfigs}
                    disabled={savingFields}
                    className="btn-futuristic rounded-xl"
                    size="sm"
                  >
                    {savingFields ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Configure which fields appear in your forms. You can show/hide, mark as required, rename, and reorder fields.
              </p>
              
              {loadingFields ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : fieldConfigs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Settings2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No field configuration found</p>
                  <p className="text-sm mt-2">Run the migration to initialize default fields</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Field Name</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2 text-center">Visible</div>
                    <div className="col-span-2 text-center">Required</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Field Rows */}
                  {fieldConfigs
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((field, index) => (
                    <div 
                      key={field.id} 
                      className={`grid grid-cols-12 gap-2 items-center p-4 rounded-xl transition-all ${
                        field.is_visible 
                          ? "bg-white/5" 
                          : "bg-white/[0.02] opacity-60"
                      }`}
                    >
                      {/* Drag Handle & Order */}
                      <div className="col-span-1 flex items-center gap-1">
                        <div className="flex flex-col">
                          <button 
                            onClick={() => moveField(field, 'up')}
                            disabled={index === 0}
                            className="text-gray-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => moveField(field, 'down')}
                            disabled={index === fieldConfigs.length - 1}
                            className="text-gray-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Field Name */}
                      <div className="col-span-4">
                        {editingFieldId === field.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingFieldLabel}
                              onChange={(e) => setEditingFieldLabel(e.target.value)}
                              className="h-8 bg-white/10 border-gray-700 rounded-lg text-sm"
                              autoFocus
                            />
                            <button 
                              onClick={() => updateFieldLabel(field, editingFieldLabel)}
                              className="text-green-500 hover:text-green-400"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setEditingFieldId(null); setEditingFieldLabel(""); }}
                              className="text-gray-500 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.field_label}</span>
                            {field.is_system && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                System
                              </span>
                            )}
                            <button 
                              onClick={() => { setEditingFieldId(field.id); setEditingFieldLabel(field.field_label); }}
                              className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mt-0.5">{field.field_name}</p>
                      </div>

                      {/* Type */}
                      <div className="col-span-2">
                        <span className="text-xs bg-white/10 px-2 py-1 rounded-lg capitalize">
                          {field.field_type}
                        </span>
                      </div>

                      {/* Visible Toggle */}
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => toggleFieldVisibility(field)}
                          className={`p-2 rounded-lg transition-all ${
                            field.is_visible 
                              ? "bg-green-500/20 text-green-500" 
                              : "bg-white/5 text-gray-600"
                          }`}
                        >
                          {field.is_visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Required Toggle */}
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => toggleFieldRequired(field)}
                          className={`p-2 rounded-lg transition-all ${
                            field.is_required 
                              ? "bg-orange-500/20 text-orange-500" 
                              : "bg-white/5 text-gray-600"
                          }`}
                        >
                          {field.is_required ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end">
                        {!field.is_system && (
                          <button
                            onClick={() => deleteFieldConfig(field)}
                            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Field */}
            <div className="glass-card rounded-2xl p-6 space-y-4 h-fit">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                Add Custom Field
              </h2>
              
              <p className="text-sm text-gray-500">
                Create new custom fields for {entityTypes.find(e => e.value === selectedEntity)?.label.toLowerCase()}
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-400 text-sm">Field Name</Label>
                  <Input 
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g., Warranty Period"
                    className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                  />
                </div>
                
                <div>
                  <Label className="text-gray-400 text-sm">Field Type</Label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="w-full mt-1 bg-white/5 border border-gray-800 rounded-xl p-2 text-white"
                  >
                    {fieldTypes.map((type) => (
                      <option key={type.value} value={type.value} className="bg-gray-900">
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {newFieldType === "select" && (
                  <div>
                    <Label className="text-gray-400 text-sm">Options (comma separated)</Label>
                    <Input 
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      placeholder="Option 1, Option 2, Option 3"
                      className="mt-1 bg-white/5 border-gray-800 rounded-xl" 
                    />
                  </div>
                )}
                
                <Button 
                  onClick={addNewFieldToConfig}
                  disabled={addingField || !newFieldName.trim()}
                  className="w-full btn-futuristic rounded-xl"
                >
                  {addingField ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Field
                    </>
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <h3 className="text-sm font-medium text-orange-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  How it works
                </h3>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• <strong>System fields</strong> are built-in and can be hidden but not deleted</li>
                  <li>• <strong>Custom fields</strong> you create can be fully edited or deleted</li>
                  <li>• Use the eye icon to show/hide fields in forms</li>
                  <li>• Use the check icon to mark fields as required</li>
                  <li>• Use arrows to reorder how fields appear</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
