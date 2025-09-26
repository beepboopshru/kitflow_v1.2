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
import { AlertTriangle, Edit, Package, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Kits() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const kits = useQuery(api.kits.list);
  const createKit = useMutation(api.kits.create);
  const updateKit = useMutation(api.kits.update);
  const deleteKit = useMutation(api.kits.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "cstem" as "cstem" | "robotics",
    description: "",
    stockCount: 0,
    lowStockThreshold: 5,
    packingRequirements: "",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "cstem",
      description: "",
      stockCount: 0,
      lowStockThreshold: 5,
      packingRequirements: "",
    });
    setEditingKit(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingKit) {
        await updateKit({
          id: editingKit._id,
          ...formData,
        });
        toast("Kit updated successfully");
      } else {
        await createKit(formData);
        toast("Kit created successfully");
      }
      
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast("Error saving kit", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  const handleEdit = (kit: any) => {
    setFormData({
      name: kit.name,
      type: kit.type,
      description: kit.description || "",
      stockCount: kit.stockCount,
      lowStockThreshold: kit.lowStockThreshold,
      packingRequirements: kit.packingRequirements || "",
    });
    setEditingKit(kit);
    setIsCreateOpen(true);
  };

  const handleDelete = async (kitId: string) => {
    if (confirm("Are you sure you want to delete this kit?")) {
      try {
        await deleteKit({ id: kitId as any });
        toast("Kit deleted successfully");
      } catch (error) {
        toast("Error deleting kit", { description: error instanceof Error ? error.message : "Unknown error" });
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
            <h1 className="text-3xl font-bold tracking-tight">Kit Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your CSTEM and Robotics kits inventory
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Kit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingKit ? "Edit Kit" : "Create New Kit"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Kit Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Kit Type</Label>
                  <Select value={formData.type} onValueChange={(value: "cstem" | "robotics") => 
                    setFormData({ ...formData, type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cstem">CSTEM</SelectItem>
                      <SelectItem value="robotics">Robotics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stockCount">Stock Count</Label>
                    <Input
                      id="stockCount"
                      type="number"
                      min="0"
                      value={formData.stockCount}
                      onChange={(e) => setFormData({ ...formData, stockCount: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min="0"
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="packingRequirements">Packing Requirements</Label>
                  <Textarea
                    id="packingRequirements"
                    value={formData.packingRequirements}
                    onChange={(e) => setFormData({ ...formData, packingRequirements: e.target.value })}
                    rows={2}
                    placeholder="e.g., 5 sensors, 2 controllers, 1 manual"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingKit ? "Update" : "Create"} Kit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Kits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits?.map((kit, index) => (
            <motion.div
              key={kit._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{kit.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {kit.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(kit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(kit._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {kit.description && (
                    <p className="text-sm text-muted-foreground">{kit.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Stock: {kit.stockCount}</span>
                    </div>
                    {kit.stockCount <= kit.lowStockThreshold && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">Low Stock</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={kit.status === "in_stock" ? "default" : "secondary"}>
                      {kit.status === "in_stock" ? "In Stock" : "Assigned"}
                    </Badge>
                  </div>

                  {kit.packingRequirements && (
                    <div>
                      <span className="text-xs text-muted-foreground">Packing:</span>
                      <p className="text-xs mt-1">{kit.packingRequirements}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {kits?.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No kits found</h3>
            <p className="text-muted-foreground">Get started by creating your first kit.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
