import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Truck, Mail, Phone, MapPin, PlusCircle, Pencil, Trash2, Printer, Package } from "lucide-react";

const SERVICE_TYPES = [
  "Printer",
  "Packer",
  "Mover",
  "Transport",
  "Courier",
  "Logistics",
  "Other"
];

export default function Services() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth");
  }, [isLoading, isAuthenticated, navigate]);

  const services = useQuery(((api as any).services.list) as any);
  const createService = useMutation(((api as any).services.create) as any);
  const updateService = useMutation(((api as any).services.update) as any);
  const removeService = useMutation(((api as any).services.remove) as any);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingService, setEditingService] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    serviceType: "",
    contact: "",
    email: "",
    address: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    serviceType: "",
    contact: "",
    email: "",
    address: "",
    notes: "",
  });

  if (isLoading || !isAuthenticated) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createService({
        name: createForm.name,
        serviceType: createForm.serviceType,
        contact: createForm.contact,
        email: createForm.email || undefined,
        address: createForm.address || undefined,
        notes: createForm.notes || undefined,
      });
      toast("Service provider created successfully");
      setIsCreateOpen(false);
      setCreateForm({ name: "", serviceType: "", contact: "", email: "", address: "", notes: "" });
    } catch (err) {
      toast("Failed to create service provider", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setEditForm({
      name: service.name,
      serviceType: service.serviceType,
      contact: service.contact,
      email: service.email || "",
      address: service.address || "",
      notes: service.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      await updateService({
        id: editingService._id,
        name: editForm.name,
        serviceType: editForm.serviceType,
        contact: editForm.contact,
        email: editForm.email || undefined,
        address: editForm.address || undefined,
        notes: editForm.notes || undefined,
      });
      toast("Service provider updated successfully");
      setIsEditOpen(false);
      setEditingService(null);
    } catch (err) {
      toast("Failed to update service provider", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Delete this service provider?")) return;
    try {
      await removeService({ id: id as any });
      toast("Service provider deleted");
    } catch (err) {
      toast("Failed to delete service provider", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const filteredServices = (services ?? []).filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === "all" || s.serviceType === filterType;
    
    return matchesSearch && matchesType;
  });

  const getServiceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "printer": return Printer;
      case "packer": return Package;
      case "mover":
      case "transport": return Truck;
      default: return Truck;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Service Providers</h1>
            <p className="text-muted-foreground mt-2">
              Manage contacts for printers, packers, movers, and transport services
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Service Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Service Provider</DialogTitle>
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
                  <Label htmlFor="serviceType">Service Type *</Label>
                  <Select
                    value={createForm.serviceType}
                    onValueChange={(value) => setCreateForm((s) => ({ ...s, serviceType: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <DialogTitle>Edit Service Provider</DialogTitle>
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
                  <Label htmlFor="edit-serviceType">Service Type *</Label>
                  <Select
                    value={editForm.serviceType}
                    onValueChange={(value) => setEditForm((s) => ({ ...s, serviceType: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            placeholder="Search by name, type, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SERVICE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredServices.length} providers</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service: any, idx: number) => {
            const ServiceIcon = getServiceIcon(service.serviceType);
            return (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <ServiceIcon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base font-medium">{service.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(service)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(service._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge variant="outline">{service.serviceType}</Badge>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{service.contact}</span>
                    </div>

                    {service.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{service.email}</span>
                      </div>
                    )}

                    {service.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">{service.address}</span>
                      </div>
                    )}

                    {service.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">{service.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredServices.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterType !== "all" 
                  ? "No service providers found matching your filters" 
                  : "No service providers yet. Create one to get started."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
