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
import { AlertTriangle, Edit, Package, Plus, Trash2, ChevronDown, ChevronUp, FileText, Download, ArrowLeft, Box } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { KitSheetMaker } from "@/components/KitSheetMaker";
import { useAction } from "convex/react";

type ProgramType = "cstem" | "robotics" | null;

export default function Kits() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const kits = useQuery(api.kits.list);
  const createKit = useMutation(api.kits.create);
  const updateKit = useMutation(api.kits.update);
  const deleteKit = useMutation(api.kits.remove);

  const rawMaterials = useQuery(api.inventory.listByCategory, { category: "raw_material" });
  const preProcessed = useQuery(api.inventory.listByCategory, { category: "pre_processed" });
  const finishedGoods = useQuery(api.inventory.listByCategory, { category: "finished_good" });
  const assignments = useQuery(api.assignments.list);

  // Navigation state: null = landing view, "cstem" | "robotics" = program view
  const [selectedProgram, setSelectedProgram] = useState<ProgramType>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "cstem" as "cstem" | "robotics",
    cstemVariant: undefined as "explorer" | "discoverer" | undefined,
    description: "",
    stockCount: 0,
    lowStockThreshold: 5,
    packingRequirements: "",
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedKitId, setExpandedKitId] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState<string>("");

  const clearPendingByKit = useMutation(api.assignments.clearPendingByKit);
  const [isKitSheetMakerOpen, setIsKitSheetMakerOpen] = useState(false);
  const [editingKitForSheetMaker, setEditingKitForSheetMaker] = useState<any>(null);
  const generatePdf = useAction(api.kitPdf.generateKitSheetPdf);

  // Filter kits based on selected program and other filters
  const filteredKits = (kits ?? []).filter((k) => {
    if (selectedProgram && k.type !== selectedProgram) return false;
    
    // Status filter based on stock levels
    let statusOk = true;
    if (statusFilter === "in_stock") {
      statusOk = k.stockCount > k.lowStockThreshold;
    } else if (statusFilter === "low_stock") {
      statusOk = k.stockCount <= k.lowStockThreshold;
    }
    
    // For CSTEM kits, filter by variant (explorer/discoverer)
    let typeOk = true;
    if (selectedProgram === "cstem" && typeFilter !== "all") {
      typeOk = k.cstemVariant === typeFilter;
    }
    
    return statusOk && typeOk;
  });

  // Get program-specific kits for stats
  const cstemKits = (kits ?? []).filter(k => k.type === "cstem");
  const roboticsKits = (kits ?? []).filter(k => k.type === "robotics");

  // Calculate stats for each program
  const getProgramStats = (programKits: any[]) => {
    const total = programKits.length;
    const lowStock = programKits.filter(k => k.stockCount <= k.lowStockThreshold).length;
    const totalStock = programKits.reduce((sum, k) => sum + k.stockCount, 0);
    return { total, lowStock, totalStock };
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const resetForm = () => {
    setFormData({
      name: "",
      type: selectedProgram || "cstem",
      cstemVariant: undefined,
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
    if (kit.isStructured) {
      setEditingKitForSheetMaker(kit);
      setIsKitSheetMakerOpen(true);
    } else {
      setFormData({
        name: kit.name,
        type: kit.type,
        cstemVariant: kit.cstemVariant,
        description: kit.description || "",
        stockCount: kit.stockCount,
        lowStockThreshold: kit.lowStockThreshold,
        packingRequirements: kit.packingRequirements || "",
      });
      setEditingKit(kit);
      setIsCreateOpen(true);
    }
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

  const toggleExpand = (id: string) => {
    setExpandedKitId((prev) => (prev === id ? null : id));
  };

  const handleAddMaterial = async (kit: any) => {
    const item = newMaterial.trim();
    if (!item) return;
    const existing = (kit.packingRequirements || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    const updated = [...existing, item].join(", ");
    try {
      await updateKit({ id: kit._id, packingRequirements: updated });
      toast("Material added");
      setNewMaterial("");
    } catch (err) {
      toast("Failed to add material", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const getPendingForKit = (kitId: string) => {
    const list = (assignments ?? []).filter(
      (a: any) => String(a.kitId) === String(kitId) && a.status !== "dispatched" && typeof a.dispatchedAt !== "number"
    );
    const totalQty = list.reduce((s: number, a: any) => s + (a.quantity ?? 0), 0);
    return { count: list.length, qty: totalQty };
  };

  const handleClearAssignments = async (kit: any) => {
    const { count, qty } = getPendingForKit(kit._id);
    if (count === 0) {
      toast("No pending assignments to clear for this kit");
      return;
    }
    const first = confirm(
      `This will delete ${count} pending assignment(s) for "${kit.name}" and restore ${qty} unit(s) to stock. Continue?`
    );
    if (!first) return;
    const second = confirm("Are you absolutely sure? This cannot be undone.");
    if (!second) return;

    try {
      const res = await clearPendingByKit({ kitId: kit._id } as any);
      toast(`Cleared ${res?.deletedCount ?? count} assignment(s); restored ${res?.restoredQty ?? qty} unit(s).`);
    } catch (err) {
      toast("Failed to clear assignments", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleRemoveMaterial = async (kit: any, index: number) => {
    const existing = (kit.packingRequirements || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (index < 0 || index >= existing.length) return;
    const updatedArr = existing.filter((_: string, i: number) => i !== index);
    const updated = updatedArr.join(", ");
    try {
      await updateKit({ id: kit._id, packingRequirements: updated });
      toast("Material removed");
    } catch (err) {
      toast("Failed to remove material", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleExportPdf = async (kit: any) => {
    try {
      toast("Generating PDF...");
      const result = await generatePdf({ kitId: kit._id });
      
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.kitName}_sheet.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast("Kit sheet downloaded! Open in browser and print to PDF.");
    } catch (err) {
      toast("Failed to generate PDF", { 
        description: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  };

  const parseStructuredMaterials = (kit: any): Array<{ name: string; materials: Array<{ name: string; quantity: number; unit: string }> }> => {
    if (!kit.isStructured || !kit.packingRequirements) return [];
    try {
      return JSON.parse(kit.packingRequirements);
    } catch {
      return [];
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  // Landing View: Program Type Selection
  if (selectedProgram === null) {
    const cstemStats = getProgramStats(cstemKits);
    const roboticsStats = getProgramStats(roboticsKits);

    return (
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kit Management</h1>
            <p className="text-muted-foreground mt-2">
              Select a program type to manage kits
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSTEM Program Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                onClick={() => setSelectedProgram("cstem")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-6 w-6" />
                    CSTEM Program
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Kits</p>
                      <p className="text-2xl font-bold">{cstemStats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Stock</p>
                      <p className="text-2xl font-bold">{cstemStats.totalStock}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Low Stock</p>
                      <p className="text-2xl font-bold text-red-600">{cstemStats.lowStock}</p>
                    </div>
                  </div>
                  {cstemStats.lowStock > 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      {cstemStats.lowStock} kit{cstemStats.lowStock > 1 ? 's' : ''} need restocking
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Robotics Program Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                onClick={() => setSelectedProgram("robotics")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-6 w-6" />
                    Robotics Program
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Kits</p>
                      <p className="text-2xl font-bold">{roboticsStats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Stock</p>
                      <p className="text-2xl font-bold">{roboticsStats.totalStock}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Low Stock</p>
                      <p className="text-2xl font-bold text-red-600">{roboticsStats.lowStock}</p>
                    </div>
                  </div>
                  {roboticsStats.lowStock > 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      {roboticsStats.lowStock} kit{roboticsStats.lowStock > 1 ? 's' : ''} need restocking
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  // Program View: Kit Management for Selected Program
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedProgram(null);
                setStatusFilter("all");
                setTypeFilter("all");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Programs
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {selectedProgram === "cstem" ? "CSTEM" : "Robotics"} Kits
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your {selectedProgram === "cstem" ? "CSTEM" : "Robotics"} kits inventory
              </p>

              {/* Filters: Status and Type */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v: "all" | "in_stock" | "low_stock") => setStatusFilter(v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedProgram === "cstem" && (
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={typeFilter}
                      onValueChange={(v: string) => setTypeFilter(v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="explorer">Explorer</SelectItem>
                        <SelectItem value="discoverer">Discoverer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => {
              setFormData({ ...formData, type: selectedProgram });
              setIsKitSheetMakerOpen(true);
            }} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Kit Sheet Maker
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setFormData({ ...formData, type: selectedProgram })}>
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
                      setFormData({ ...formData, type: value, cstemVariant: value === "robotics" ? undefined : formData.cstemVariant })
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

                  {formData.type === "cstem" && (
                    <div>
                      <Label htmlFor="cstemVariant">CSTEM Variant</Label>
                      <Select 
                        value={formData.cstemVariant || ""} 
                        onValueChange={(value: "explorer" | "discoverer") => 
                          setFormData({ ...formData, cstemVariant: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="explorer">Explorer</SelectItem>
                          <SelectItem value="discoverer">Discoverer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
        </div>

        {/* Kits Table */}
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Kit Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Pending</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKits.map((kit, index) => {
                  const structuredPouches = parseStructuredMaterials(kit);
                  const isStructured = kit.isStructured && structuredPouches.length > 0;
                  const pending = getPendingForKit(kit._id);
                  const isExpanded = expandedKitId === kit._id;
                  
                  return (
                    <>
                      <motion.tr
                        key={kit._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(kit._id)}
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            {kit.name}
                            {kit.stockCount <= kit.lowStockThreshold && (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {kit.type === "cstem" && kit.cstemVariant 
                              ? kit.cstemVariant.toUpperCase() 
                              : kit.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{kit.stockCount}</td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={kit.stockCount <= kit.lowStockThreshold ? "destructive" : "default"} 
                            className="text-xs"
                          >
                            {kit.stockCount <= kit.lowStockThreshold ? "Low stock" : "In stock"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pending.count > 0 ? `${pending.count} (${pending.qty} units)` : "-"}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex space-x-1">
                            {isStructured && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportPdf(kit);
                                }}
                                title="Export Kit Sheet"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(kit);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(kit._id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-3">
                              {kit.description && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Description:</span>
                                  <p className="text-sm mt-1">{kit.description}</p>
                                </div>
                              )}
                              
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {isStructured ? "Pouches & Materials" : "Materials Required"}
                                </span>
                                
                                {isStructured ? (
                                  <div className="mt-2 space-y-3">
                                    {structuredPouches.map((pouch, pIdx) => (
                                      <div key={pIdx} className="border rounded p-2 bg-background">
                                        <div className="font-medium text-sm mb-1">{pouch.name}</div>
                                        <ul className="space-y-1 text-xs">
                                          {pouch.materials.map((material, mIdx) => (
                                            <li key={mIdx} className="flex justify-between gap-2">
                                              <span className="flex-1 break-words">• {material.name}</span>
                                              <span className="flex-shrink-0 font-medium whitespace-nowrap">
                                                {material.quantity} {material.unit}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <>
                                    {kit.packingRequirements && kit.packingRequirements.trim().length > 0 ? (
                                      <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                                        {kit.packingRequirements
                                          .split(",")
                                          .map((s: string) => s.trim())
                                          .filter((s: string) => s.length > 0)
                                          .map((item: string, idx: number) => (
                                            <li key={idx} className="flex items-center justify-between gap-2">
                                              <span>{item}</span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRemoveMaterial(kit, idx);
                                                }}
                                              >
                                                Remove
                                              </Button>
                                            </li>
                                          ))}
                                      </ul>
                                    ) : (
                                      <div className="text-sm text-muted-foreground mt-2">No materials specified.</div>
                                    )}
                                    <div className="mt-3 flex items-center gap-2">
                                      <div className="flex-1">
                                        <Input
                                          placeholder="Search inventory items..."
                                          value={newMaterial}
                                          onChange={(e) => setNewMaterial(e.target.value)}
                                          list="inventory-items"
                                        />
                                        <datalist id="inventory-items">
                                          {[...(rawMaterials ?? [])]
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((i: any) => (
                                              <option key={`raw-${i._id}`} value={i.name}>
                                                {i.name} • Raw • {i.quantity} available
                                              </option>
                                            ))}
                                          {[...(preProcessed ?? [])]
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((i: any) => (
                                              <option key={`pre-${i._id}`} value={i.name}>
                                                {i.name} • Pre-Processed • {i.quantity} available
                                              </option>
                                            ))}
                                          {[...(finishedGoods ?? [])]
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((i: any) => (
                                              <option key={`fin-${i._id}`} value={i.name}>
                                                {i.name} • Finished • {i.quantity} available
                                              </option>
                                            ))}
                                        </datalist>
                                      </div>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddMaterial(kit);
                                        }}
                                      >
                                        Add
                                      </Button>
                                    </div>

                                    {pending.count > 0 && (
                                      <div className="mt-4 flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">
                                          Pending assignments: {pending.count} • Qty pending: {pending.qty}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearAssignments(kit);
                                          }}
                                        >
                                          Clear Assignments
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredKits.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No kits match your filters</h3>
            <p className="text-muted-foreground">Try adjusting the filters above.</p>
          </div>
        )}
      </div>

      <KitSheetMaker 
        open={isKitSheetMakerOpen} 
        onOpenChange={(open) => {
          setIsKitSheetMakerOpen(open);
          if (!open) setEditingKitForSheetMaker(null);
        }}
        editingKit={editingKitForSheetMaker}
      />
    </Layout>
  );
}