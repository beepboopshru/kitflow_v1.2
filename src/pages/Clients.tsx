import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Building, Edit, Mail, Phone, Plus, Trash2, Users } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { format } from "date-fns";

function ClientMonthwiseView({ client }: { client: any }) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  const clientAssignments = useQuery(
    api.assignments.getByClient,
    client ? ({ clientId: client._id } as any) : "skip"
  );

  if (!clientAssignments) {
    return <div className="text-sm text-muted-foreground p-4">Loading...</div>;
  }
  
  if (clientAssignments.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No assignments yet.</div>;
  }

  // Build month options from data based on dispatchedAt date
  const byMonth: Record<string, Array<any>> = {};
  clientAssignments.forEach((a) => {
    if (typeof a.dispatchedAt === "number") {
      const d = new Date(a.dispatchedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(a);
    }
  });
  const months = Object.keys(byMonth).sort((a, b) => (a < b ? 1 : -1));

  // Set default month if not selected
  if (!selectedMonth && months.length > 0) {
    setSelectedMonth(months[0]);
  }

  const monthAssignments = selectedMonth ? byMonth[selectedMonth] ?? [] : [];

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Controls row */}
      <div className="grid grid-cols-1 gap-4 items-end">
        {/* Month dropdown */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Month</Label>
          <Select
            value={selectedMonth}
            onValueChange={(val: string) => setSelectedMonth(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {new Date(`${m}-01`).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected month's grade-wise content */}
      {selectedMonth ? (
        <div className="rounded-lg border w-full">
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="font-semibold text-lg">
              {new Date(`${selectedMonth}-01`).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </div>
            <Badge variant="secondary" className="text-sm">
              Total Qty: {monthAssignments.reduce((s, a) => s + a.quantity, 0)}
            </Badge>
          </div>

          {/* Stacked list: Grade • Kit • Qty • Dispatch Date */}
          <div className="space-y-3 p-4">
            {(() => {
              const gradeOrder: Array<number | "unspecified"> = [
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "unspecified",
              ];

              const byGrade = (g: number | "unspecified") => {
                if (g === "unspecified") {
                  return monthAssignments.filter((a) => typeof a.grade === "undefined");
                }
                return monthAssignments.filter((a) => a.grade === g);
              };

              return (
                <>
                  {gradeOrder.map((g) => {
                    const list = byGrade(g);
                    if (list.length === 0) return null;

                    const byKit: Record<
                      string,
                      {
                        kitName: string;
                        totalQty: number;
                        dispatchedValues: Array<number | undefined>;
                      }
                    > = {};

                    list.forEach((a) => {
                      const key = String(a.kitId);
                      if (!byKit[key]) {
                        byKit[key] = {
                          kitName: a.kit?.name ?? "Kit",
                          totalQty: 0,
                          dispatchedValues: [],
                        };
                      }
                      byKit[key].totalQty += a.quantity;
                      byKit[key].dispatchedValues.push(a.dispatchedAt);
                    });

                    const rows = Object.values(byKit);

                    return (
                      <div key={`grade-${g}`} className="rounded-md border bg-card">
                        <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
                          <div className="font-semibold text-base">
                            {g === "unspecified" ? "Unspecified Grade" : `Grade ${g}`}
                          </div>
                          <Badge variant="outline" className="font-medium">
                            Total: {rows.reduce((s, r) => s + r.totalQty, 0)}
                          </Badge>
                        </div>

                        <div className="divide-y">
                          {rows.map((r, i) => {
                            const values = r.dispatchedValues;
                            const hasAny = values.some((v) => typeof v === "number");
                            if (!hasAny) {
                              return (
                                <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                                  <div className="text-sm font-medium flex-1">
                                    <span className="text-foreground">{r.kitName}</span>
                                    <span className="text-muted-foreground mx-2">•</span>
                                    <span className="text-muted-foreground">Qty: {r.totalQty}</span>
                                  </div>
                                  <div className="shrink-0">
                                    <Badge variant="secondary" className="text-xs">Not set</Badge>
                                  </div>
                                </div>
                              );
                            }
                            const nums = values.filter((v): v is number => typeof v === "number");
                            const allEqual = nums.every((v) => v === nums[0]);
                            if (allEqual) {
                              return (
                                <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                                  <div className="text-sm font-medium flex-1">
                                    <span className="text-foreground">{r.kitName}</span>
                                    <span className="text-muted-foreground mx-2">•</span>
                                    <span className="text-muted-foreground">Qty: {r.totalQty}</span>
                                  </div>
                                  <div className="shrink-0">
                                    <Badge variant="default" className="text-xs">
                                      Dispatch Data: {new Date(nums[0]).toLocaleDateString()}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                                <div className="text-sm font-medium flex-1">
                                  <span className="text-foreground">{r.kitName}</span>
                                  <span className="text-muted-foreground mx-2">•</span>
                                  <span className="text-muted-foreground">Qty: {r.totalQty}</span>
                                </div>
                                <div className="shrink-0">
                                  <Badge variant="outline" className="text-xs">Dispatched: Mixed</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Clients() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const clients = useQuery(api.clients.list);
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const deleteClient = useMutation(api.clients.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    contact: "",
    type: "monthly" as "monthly" | "one_time",
    email: "",
    notes: "",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const resetForm = () => {
    setFormData({
      name: "",
      organization: "",
      contact: "",
      type: "monthly",
      email: "",
      notes: "",
    });
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        await updateClient({
          id: editingClient._id,
          ...formData,
        });
        toast("Client updated successfully");
      } else {
        await createClient(formData);
        toast("Client created successfully");
      }
      
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast("Error saving client", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  const handleEdit = (client: any) => {
    setFormData({
      name: client.name,
      organization: client.organization,
      contact: client.contact,
      type: client.type,
      email: client.email || "",
      notes: client.notes || "",
    });
    setEditingClient(client);
    setIsCreateOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
      try {
        await deleteClient({ id: clientId as any });
        toast("Client deleted successfully");
      } catch (error) {
        toast("Error deleting client", { description: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your client database and contact information
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "Create New Client"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Contact Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact">Phone Number</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Client Type</Label>
                  <Select value={formData.type} onValueChange={(value: "monthly" | "one_time") => 
                    setFormData({ ...formData, type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="one_time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional notes about the client..."
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingClient ? "Update" : "Create"} Client
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <Input
            placeholder="Search clients by name, organization, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Clients Accordion */}
        <Card>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {clients?.filter((client) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  client.name.toLowerCase().includes(query) ||
                  client.organization.toLowerCase().includes(query) ||
                  client.contact.toLowerCase().includes(query) ||
                  (client.email && client.email.toLowerCase().includes(query))
                );
              }).map((client, index) => (
                <AccordionItem key={client._id} value={client._id}>
                  <div className="px-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 py-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <AccordionTrigger className="hover:no-underline p-0 flex-none">
                            <h3 className="font-semibold text-base">{client.name}</h3>
                          </AccordionTrigger>
                          <Badge variant="outline" className="text-xs">
                            {client.type === "monthly" ? "Monthly" : "One Time"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{client.organization}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{client.contact}</span>
                          </div>

                          {client.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                        </div>

                        {client.notes && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Notes:</span> {client.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(client)}
                          title="Edit Client"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client._id)}
                          title="Delete Client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <AccordionContent>
                    <ClientMonthwiseView client={client} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {clients?.filter((client) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            client.name.toLowerCase().includes(query) ||
            client.organization.toLowerCase().includes(query) ||
            client.contact.toLowerCase().includes(query) ||
            (client.email && client.email.toLowerCase().includes(query))
          );
        }).length === 0 && clients && clients.length > 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No clients match your search</h3>
            <p className="text-muted-foreground">Try adjusting your search terms.</p>
          </div>
        )}

        {clients?.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No clients found</h3>
            <p className="text-muted-foreground">Get started by adding your first client.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}