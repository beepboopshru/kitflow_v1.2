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
import { Building2, Mail, Phone, MapPin, PlusCircle, Pencil, Trash2 } from "lucide-react";

export default function VendorContacts() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth");
  }, [isLoading, isAuthenticated, navigate]);

  const vendors = useQuery(api.vendors.list as any);
  const createVendor = useMutation(api.vendors.create as any);
  const updateVendor = useMutation(api.vendors.update as any);
  const removeVendor = useMutation(api.vendors.remove as any);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingVendor, setEditingVendor] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    organization: "",
    contact: "",
    email: "",
    address: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
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
        name: createForm.name,
        organization: createForm.organization,
        contact: createForm.contact,
        email: createForm.email || undefined,
        address: createForm.address || undefined,
        notes: createForm.notes || undefined,
      });
      toast("Vendor created successfully");
      setIsCreateOpen(false);
      setCreateForm({ name: "", organization: "", contact: "", email: "", address: "", notes: "" });
    } catch (err) {
      toast("Failed to create vendor", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setEditForm({
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
        name: editForm.name,
        organization: editForm.organization,
        contact: editForm.contact,
        email: editForm.email || undefined,
        address: editForm.address || undefined,
        notes: editForm.notes || undefined,
      });
      toast("Vendor updated successfully");
      setIsEditOpen(false);
      setEditingVendor(null);
    } catch (err) {
      toast("Failed to update vendor", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    try {
      await removeVendor({ id: id as any });
      toast("Vendor deleted");
    } catch (err) {
      toast("Failed to delete vendor", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const filteredVendors = (vendors ?? []).filter((v: any) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.email && v.email.toLowerCase().includes(searchQuery.toLowerCase()))
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
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="organization">Organization *</Label>
                  <Input
                    id="organization"
                    value={createForm.organization}
                    onChange={(e) => setCreateForm((s) => ({ ...s, organization: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact">Phone Number *</Label>
                  <Input
                    id="contact"
                    value={createForm.contact}
                    onChange={(e) => setCreateForm((s) => ({ ...s, contact: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    rows={2}
                    value={createForm.address}
                    onChange={(e) => setCreateForm((s) => ({ ...s, address: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={createForm.notes}
                    onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))}
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
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-organization">Organization *</Label>
                  <Input
                    id="edit-organization"
                    value={editForm.organization}
                    onChange={(e) => setEditForm((s) => ({ ...s, organization: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-contact">Phone Number *</Label>
                  <Input
                    id="edit-contact"
                    value={editForm.contact}
                    onChange={(e) => setEditForm((s) => ({ ...s, contact: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Textarea
                    id="edit-address"
                    rows={2}
                    value={editForm.address}
                    onChange={(e) => setEditForm((s) => ({ ...s, address: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm((s) => ({ ...s, notes: e.target.value }))}
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
            placeholder="Search vendors by name, organization, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <Badge variant="secondary">{filteredVendors.length} vendors</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor: any, idx: number) => (
            <motion.div
              key={vendor._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-medium">{vendor.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(vendor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(vendor._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{vendor.organization}</div>
                  
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
                {searchQuery ? "No vendors found matching your search" : "No vendors yet. Create one to get started."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
