import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Package, Plus, Truck, CalendarIcon, Trash2, Edit2, Check, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

export default function Assignments() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const assignments = useQuery(api.assignments.list);
  const kits = useQuery(api.kits.list);
  const clients = useQuery(api.clients.list);
  const programs = useQuery(api.programs.list);
  const createAssignment = useMutation(api.assignments.create);
  const updateStatus = useMutation(api.assignments.updateStatus);
  const updateNotes = useMutation(api.assignments.updateNotes);
  const deleteAssignment = useMutation(api.assignments.deleteAssignment);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    programSlug: "",
    kitId: "",
    clientId: "",
    quantity: "" as number | "",
    notes: "",
    grade: null as number | null,
    dispatchDate: undefined as Date | undefined,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "packed" | "dispatched">("all");
  const [kitFilter, setKitFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [editingNotes, setEditingNotes] = useState<{ id: string; value: string } | null>(null);

  // Get unique months from assignments for the filter dropdown
  const availableMonths = Array.from(
    new Set(
      (assignments ?? []).map((a) => {
        const date = new Date(a.dispatchedAt || a.assignedAt);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      })
    )
  ).sort().reverse();

  // Filter assignments based on selected filters
  const filteredAssignments = (assignments ?? []).filter((assignment) => {
    const statusOk = statusFilter === "all" ? true : assignment.status === statusFilter;
    const kitOk = kitFilter === "all" ? true : assignment.kitId === kitFilter;
    const clientOk = clientFilter === "all" ? true : assignment.clientId === clientFilter;
    
    // Month filter based on dispatch date or assigned date
    let monthOk = true;
    if (monthFilter !== "all") {
      const date = new Date(assignment.dispatchedAt || assignment.assignedAt);
      const assignmentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthOk = assignmentMonth === monthFilter;
    }
    
    return statusOk && kitOk && clientOk && monthOk;
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const resetForm = () => {
    setFormData({
      programSlug: "",
      kitId: "",
      clientId: "",
      quantity: "",
      notes: "",
      grade: null,
      dispatchDate: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.quantity || formData.quantity <= 0) {
      toast("Error creating assignment", { description: "Please enter a valid quantity" });
      return;
    }
    
    try {
      await createAssignment({
        kitId: formData.kitId as any,
        clientId: formData.clientId as any,
        quantity: formData.quantity as number,
        notes: formData.notes || undefined,
        grade: formData.grade ?? undefined,
        dispatchedAt: formData.dispatchDate ? formData.dispatchDate.getTime() : undefined,
      });
      toast("Assignment created successfully");
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast("Error creating assignment", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  const handleStatusUpdate = async (assignmentId: string, newStatus: "assigned" | "packed" | "dispatched") => {
    try {
      await updateStatus({
        id: assignmentId as any,
        status: newStatus,
      });
      toast(`Assignment marked as ${newStatus}`);
    } catch (error) {
      toast("Error updating status", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  const handleSaveNotes = async (assignmentId: string) => {
    if (!editingNotes) return;
    
    try {
      await updateNotes({
        id: assignmentId as any,
        notes: editingNotes.value || undefined,
      });
      toast("Notes updated successfully");
      setEditingNotes(null);
    } catch (error) {
      toast("Error updating notes", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
  };

  const handleDeleteAssignment = async (assignmentId: string, assignmentStatus: string) => {
    const confirmMsg = assignmentStatus === "dispatched" 
      ? "This assignment is dispatched. Stock will NOT be restored. Delete anyway?"
      : "Delete this assignment? Stock will be restored to the kit.";
    
    if (!confirm(confirmMsg)) return;

    try {
      await deleteAssignment({ id: assignmentId as any });
      toast("Assignment deleted successfully");
    } catch (error) {
      toast("Error deleting assignment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned": return "secondary";
      case "packed": return "default";
      case "dispatched": return "outline";
      default: return "secondary";
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
            <h1 className="text-3xl font-bold tracking-tight">Kit Assignments</h1>
            <p className="text-muted-foreground mt-2">
              Manage kit assignments and track packing status
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Assignment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="programSlug">Program</Label>
                    <Select value={formData.programSlug} onValueChange={(value) => 
                      setFormData({ ...formData, programSlug: value, kitId: "" })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs?.map((program) => (
                          <SelectItem key={program._id} value={program.slug}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="kitId">Kit</Label>
                    <Select 
                      value={formData.kitId} 
                      onValueChange={(value) => setFormData({ ...formData, kitId: value })}
                      disabled={!formData.programSlug}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.programSlug ? "Select a kit" : "Select a program first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {kits?.filter(kit => kit.type === formData.programSlug).map((kit) => (
                          <SelectItem key={kit._id} value={kit._id}>
                            {kit.name} (Stock: {kit.stockCount}{kit.stockCount < 0 ? ' - To be Made' : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="clientId">Client</Label>
                    <Select value={formData.clientId} onValueChange={(value) => 
                      setFormData({ ...formData, clientId: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client._id} value={client._id}>
                            {client.name} - {client.organization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      value={formData.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, quantity: val === "" ? "" : parseInt(val) || "" });
                      }}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="grade">Grade (optional)</Label>
                    <Select
                      value={formData.grade === null ? "none" : String(formData.grade)}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          grade: value === "none" ? null : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade (1-10)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Grade</SelectItem>
                        <Separator className="my-1" />
                        <SelectItem value="1">Grade 1</SelectItem>
                        <SelectItem value="2">Grade 2</SelectItem>
                        <SelectItem value="3">Grade 3</SelectItem>
                        <SelectItem value="4">Grade 4</SelectItem>
                        <SelectItem value="5">Grade 5</SelectItem>
                        <SelectItem value="6">Grade 6</SelectItem>
                        <SelectItem value="7">Grade 7</SelectItem>
                        <SelectItem value="8">Grade 8</SelectItem>
                        <SelectItem value="9">Grade 9</SelectItem>
                        <SelectItem value="10">Grade 10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Dispatch Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dispatchDate ? format(formData.dispatchDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dispatchDate}
                          onSelect={(date) => setFormData({ ...formData, dispatchDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Additional notes for this assignment..."
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Assignment
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter Section */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs mb-2">Month</Label>
              <Select
                value={monthFilter}
                onValueChange={(v: string) => setMonthFilter(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map((month) => {
                    const [year, monthNum] = month.split("-");
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                    return (
                      <SelectItem key={month} value={month}>
                        {monthName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v: "all" | "assigned" | "packed" | "dispatched") => setStatusFilter(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2">Kit</Label>
              <Select
                value={kitFilter}
                onValueChange={(v: string) => setKitFilter(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Kits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kits</SelectItem>
                  {kits?.map((kit) => (
                    <SelectItem key={kit._id} value={kit._id}>
                      {kit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2">Client</Label>
              <Select
                value={clientFilter}
                onValueChange={(v: string) => setClientFilter(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name} - {client.organization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <div className="text-sm text-muted-foreground">
                {filteredAssignments.length > 0 && (
                  <>Showing {filteredAssignments.length} of {assignments?.length || 0} assignments</>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Assignments Table */}
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Kit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Qty</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Grade</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Dispatch Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((assignment, index) => (
                  <motion.tr
                    key={assignment._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{assignment.kit?.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{assignment.client?.name}</div>
                      <div className="text-xs text-muted-foreground">{assignment.client?.organization}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{assignment.quantity}</td>
                    <td className="px-4 py-3 text-sm">
                      {assignment.grade ? `Grade ${assignment.grade}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusColor(assignment.status) as any} className="text-xs">
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {assignment.dispatchedAt 
                        ? new Date(assignment.dispatchedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[200px]">
                      {editingNotes?.id === assignment._id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingNotes.value}
                            onChange={(e) => setEditingNotes({ id: assignment._id, value: e.target.value })}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveNotes(assignment._id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveNotes(assignment._id)}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 group"
                          onClick={() => setEditingNotes({ id: assignment._id, value: assignment.notes || "" })}
                          title="Click to edit notes"
                        >
                          <span className="truncate flex-1">{assignment.notes || "-"}</span>
                          <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-1">
                        {assignment.status === "assigned" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(assignment._id, "packed")}
                            className="h-8 px-2"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            Pack
                          </Button>
                        )}
                        {assignment.status === "packed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(assignment._id, "dispatched")}
                            className="h-8 px-2"
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Dispatch
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAssignment(assignment._id, assignment.status)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No assignments found</h3>
            <p className="text-muted-foreground">Create your first kit assignment to get started.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}