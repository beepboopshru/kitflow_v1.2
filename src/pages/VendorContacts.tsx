import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PlusCircle, Mail, Phone, MapPin, Building2, Pencil, Trash2 } from "lucide-react";

export default function VendorContacts() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth");
  }, [isLoading, isAuthenticated, navigate]);

  // Use a temporary any-cast to avoid typegen lag until Convex updates _generated/api
  const vendors = useQuery((api as any).vendors.list);
  const createVendor = useMutation((api as any).vendors.create);
  const updateVendor = useMutation((api as any).vendors.update);
  const removeVendor = useMutation((api as any).vendors.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    organization: "",
    contact: "",
    email: "",
    address: "",
    notes: "",
  });

  if (isLoading || !isAuthenticated) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVendor({
        name: form.name,
        organization: form.organization,
        contact: form.contact,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      toast("Vendor created successfully");
      setIsCreateOpen(false);
      setForm({ name: "", organization: "", contact: "", email: "", address: "", notes: "" });
    } catch (err) {
      toast("Failed to create vendor", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      organization: vendor.organization,
      contact: vendor.contact,
      email: vendor.email || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;
    try {
      await updateVendor({
        id: editingVendor._id,
        name: form.name,
        organization: form.organization,
        contact: form.contact,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      toast("Vendor updated successfully");
      setIsEditOpen(false);
      setEditingVendor(null);
      setForm({ name: "", organization: "", contact: "", email: "", address: "", notes: "" });
    } catch (err) {
      toast("Failed to update vendor", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    try {
      await removeVendor({ id: id as any });
      toast("Vendor deleted successfully");
    } catch (err) {
      toast("Failed to delete vendor", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const filteredVendors = (vendors ?? []).filter((v: any) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendor Contacts</h1>
            <p className="text-muted-foreground mt-2">
              Manage vendor information and contact details
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Contact Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={form.organization}
                    onChange={(e) => setForm((s) => ({ ...s, organization: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact">Phone Number</Label>
                  <Input
                    id="contact"
                    value={form.contact}
                    onChange={(e) => setForm((s) => ({ ...s, contact: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address (optional)</Label>
                  <Textarea
                    id="address"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Contact Name</Label>
                  <Input
                    id="edit-name"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-organization">Organization</Label>
                  <Input
                    id="edit-organization"
                    value={form.organization}
                    onChange={(e) => setForm((s) => ({ ...s, organization: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-contact">Phone Number</Label>
                  <Input
                    id="edit-contact"
                    value={form.contact}
                    onChange={(e) => setForm((s) => ({ ...s, contact: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-email">Email (optional)</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-address">Address (optional)</Label>
                  <Textarea
                    id="edit-address"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-notes">Notes (optional)</Label>
                  <Textarea
                    id="edit-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="secondary">{filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor: any, idx: number) => (
            <motion.div
              key={vendor._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {vendor.organization}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(vendor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(vendor._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{vendor.contact}</span>
                  </div>
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">{vendor.address}</span>
                    </div>
                  )}
                  {vendor.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">{vendor.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No vendors found matching your search" : "No vendors yet. Create one to get started."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}