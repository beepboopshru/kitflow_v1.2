import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Package, Plus, Truck } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function Assignments() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const assignments = useQuery(api.assignments.list);
  const kits = useQuery(api.kits.list);
  const clients = useQuery(api.clients.list);
  const createAssignment = useMutation(api.assignments.create);
  const updateStatus = useMutation(api.assignments.updateStatus);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    kitId: "",
    clientId: "",
    quantity: 1,
    notes: "",
    // Add optional grade for 1-10 levels
    grade: null as number | null,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const resetForm = () => {
    setFormData({
      kitId: "",
      clientId: "",
      quantity: 1,
      notes: "",
      grade: null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createAssignment({
        kitId: formData.kitId as any,
        clientId: formData.clientId as any,
        quantity: formData.quantity,
        notes: formData.notes || undefined,
        grade: formData.grade ?? undefined,
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
                  <Label htmlFor="kitId">Kit</Label>
                  <Select value={formData.kitId} onValueChange={(value) => 
                    setFormData({ ...formData, kitId: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a kit" />
                    </SelectTrigger>
                    <SelectContent>
                      {kits?.filter(kit => kit.stockCount > 0).map((kit) => (
                        <SelectItem key={kit._id} value={kit._id}>
                          {kit.name} (Stock: {kit.stockCount})
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
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="grade">Grade (optional)</Label>
                  <Select
                    value={formData.grade === null ? "none" : String(formData.grade)}
                    onValueChange={(value) =>
                      setFormData({ ...formData, grade: value === "none" ? null : parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade (1-10)" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Provide a clearable option with a non-empty value per shadcn guidance */}
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

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments?.map((assignment, index) => (
            <motion.div
              key={assignment._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <CardTitle className="text-lg">
                          {assignment.kit?.name} → {assignment.client?.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {assignment.client?.organization} • Qty: {assignment.quantity}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(assignment.status) as any}>
                      {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-muted-foreground">
                        Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                      </div>
                      {assignment.notes && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Notes:</span> {assignment.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      {assignment.status === "assigned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(assignment._id, "packed")}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Mark Packed
                        </Button>
                      )}
                      {assignment.status === "packed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(assignment._id, "dispatched")}
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          Mark Dispatched
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {assignments?.length === 0 && (
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