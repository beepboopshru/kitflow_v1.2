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
import { AlertTriangle, Edit, Package, Plus, Trash2, ChevronDown, ChevronUp, FileText, Download, ArrowLeft, Box, Copy, ImageIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { KitSheetMaker } from "@/components/KitSheetMaker";
import { useAction } from "convex/react";
import { KitImageViewer } from "@/components/KitImageViewer";

type ProgramType = "cstem" | "robotics" | null;

export default function Kits() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const kits = useQuery(api.kits.list);
  const programs = useQuery(api.programs.list);
  const createKit = useMutation(api.kits.create);
  const updateKit = useMutation(api.kits.update);
  const deleteKit = useMutation(api.kits.remove);
  const createProgram = useMutation(api.programs.create);
  const deleteProgram = useMutation(api.programs.remove);

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
    type: "cstem" as string,
    cstemVariant: undefined as "explorer" | "discoverer" | undefined,
    description: "",
    stockCount: 0,
    lowStockThreshold: 5,
    packingRequirements: "",
  });

  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [newProgramData, setNewProgramData] = useState({
    name: "",
    slug: "",
    description: "",
    categories: "",
  });

  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [editProgramData, setEditProgramData] = useState({
    name: "",
    description: "",
    categories: "",
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedKitId, setExpandedKitId] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState<string>("");
  const [editingRemarksKitId, setEditingRemarksKitId] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState<string>("");

  const copyKit = useMutation(api.kits.copy);
  const clearPendingByKit = useMutation(api.assignments.clearPendingByKit);
  const updateProgram = useMutation(api.programs.update);
  const [isKitSheetMakerOpen, setIsKitSheetMakerOpen] = useState(false);
  const [editingKitForSheetMaker, setEditingKitForSheetMaker] = useState<any>(null);
  const generatePdf = useAction(api.kitPdf.generateKitSheetPdf);

  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyingKit, setCopyingKit] = useState<any>(null);
  const [copyTargetProgram, setCopyTargetProgram] = useState<string>("");
  const [copyKitName, setCopyKitName] = useState<string>("");

  // Add new state for image handling
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [viewingImageKit, setViewingImageKit] = useState<any>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
const getImageUrl = useQuery(
  api.storage.getImageUrl,
  editingKit?.image ? { storageId: editingKit.image } : "skip"
);

  // Add image upload handler function
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast("Image size must be less than 5MB");
      return;
    }

    try {
      setUploadingImage(true);
      
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();
      
      // Store the uploaded image ID
      setUploadedImageId(storageId);
      
      // Set the image in editingKit if it exists
      setEditingKit((prev: any) => prev ? { ...prev, image: storageId } : prev);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast("Image uploaded successfully");
    } catch (error) {
      console.error("Image upload error:", error);
      toast("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

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

  // Calculate stats for each program dynamically
  const getProgramStats = (programSlug: string) => {
    const programKits = (kits ?? []).filter(k => k.type === programSlug);
    const total = programKits.length;
    const lowStock = programKits.filter(k => k.stockCount <= k.lowStockThreshold).length;
    const totalStock = programKits.reduce((sum, k) => sum + k.stockCount, 0);
    return { total, lowStock, totalStock };
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProgramData.name.trim()) {
      toast("Please enter a program name");
      return;
    }

    try {
      // Auto-generate slug if not provided
      const slug = newProgramData.slug.trim() || 
        newProgramData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Parse categories from comma-separated string
      const categories = newProgramData.categories
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);
      
      await createProgram({
        name: newProgramData.name,
        slug: slug,
        description: newProgramData.description,
        categories: categories.length > 0 ? categories : undefined,
      });
      
      toast("Program created successfully");
      setIsCreateProgramOpen(false);
      setNewProgramData({ name: "", slug: "", description: "", categories: "" });
    } catch (error) {
      toast("Error creating program", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  };

  const handleDeleteProgram = async (programId: string, programName: string) => {
    if (confirm(`Are you sure you want to delete the "${programName}" program? This will fail if any kits are associated with it.`)) {
      try {
        await deleteProgram({ id: programId as any });
        toast("Program deleted successfully");
      } catch (error) {
        toast("Error deleting program", { 
          description: error instanceof Error ? error.message : "Cannot delete program with associated kits" 
        });
      }
    }
  };

  const handleEditProgram = (program: any) => {
    setEditingProgram(program);
    setEditProgramData({
      name: program.name,
      description: program.description || "",
      categories: program.categories ? program.categories.join(", ") : "",
    });
    setIsEditProgramOpen(true);
  };

  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProgram || !editProgramData.name.trim()) {
      toast("Please enter a program name");
      return;
    }

    try {
      // Parse categories from comma-separated string
      const categories = editProgramData.categories
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);
      
      await updateProgram({
        id: editingProgram._id,
        name: editProgramData.name,
        description: editProgramData.description,
        categories: categories.length > 0 ? categories : undefined,
      });
      
      toast("Program updated successfully");
      setIsEditProgramOpen(false);
      setEditingProgram(null);
      setEditProgramData({ name: "", description: "", categories: "" });
    } catch (error) {
      toast("Error updating program", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    }
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
    setUploadedImageId(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingKit) {
        await updateKit({
          id: editingKit._id,
          ...formData,
          image: editingKit.image || uploadedImageId || undefined,
        });
        toast("Kit updated successfully");
      } else {
        await createKit({
          ...formData,
          image: uploadedImageId || undefined,
        });
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

  const handleCopyKit = async () => {
    if (!copyingKit || !copyTargetProgram) {
      toast("Please select a target program");
      return;
    }

    try {
      await copyKit({
        kitId: copyingKit._id,
        newType: copyTargetProgram,
        newName: copyKitName.trim() || undefined,
      });
      toast("Kit copied successfully");
      setIsCopyDialogOpen(false);
      setCopyingKit(null);
      setCopyTargetProgram("");
      setCopyKitName("");
    } catch (error) {
      toast("Error copying kit", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  };

  const openCopyDialog = (kit: any) => {
    setCopyingKit(kit);
    setCopyKitName(`${kit.name} (Copy)`);
    setCopyTargetProgram("");
    setIsCopyDialogOpen(true);
  };

  const parseStructuredMaterials = (kit: any): Array<{ name: string; materials: Array<{ name: string; quantity: number; unit: string; notes?: string }> }> => {
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
    return (
      <Layout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Kit Management</h1>
              <p className="text-muted-foreground mt-2">
                Select a program type to manage kits
              </p>
            </div>
            <Dialog open={isCreateProgramOpen} onOpenChange={setIsCreateProgramOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Program
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Program</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProgram} className="space-y-4">
                  <div>
                    <Label htmlFor="programName">Program Name</Label>
                    <Input
                      id="programName"
                      value={newProgramData.name}
                      onChange={(e) => setNewProgramData({ ...newProgramData, name: e.target.value })}
                      placeholder="e.g., Electronics, Mechanics"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="programSlug">Slug (optional)</Label>
                    <Input
                      id="programSlug"
                      value={newProgramData.slug}
                      onChange={(e) => setNewProgramData({ ...newProgramData, slug: e.target.value })}
                      placeholder="Auto-generated from name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Lowercase, alphanumeric with hyphens only
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="programDescription">Description (optional)</Label>
                    <Textarea
                      id="programDescription"
                      value={newProgramData.description}
                      onChange={(e) => setNewProgramData({ ...newProgramData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="programCategories">Categories (optional)</Label>
                    <Input
                      id="programCategories"
                      value={newProgramData.categories}
                      onChange={(e) => setNewProgramData({ ...newProgramData, categories: e.target.value })}
                      placeholder="e.g., Explorer, Discoverer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated list of categories for this program
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateProgramOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Program</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(programs ?? []).map((program, index) => {
              const stats = getProgramStats(program.slug);
              return (
                <motion.div
                  key={program._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                    onClick={() => setSelectedProgram(program.slug as ProgramType)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Box className="h-6 w-6" />
                          {program.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProgram(program);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProgram(program._id, program.name);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {program.description && (
                        <p className="text-xs text-muted-foreground">{program.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Kits</p>
                          <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Stock</p>
                          <p className="text-2xl font-bold">{stats.totalStock}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Low Stock</p>
                          <p className="text-2xl font-bold text-red-600">{stats.lowStock}</p>
                        </div>
                      </div>
                      {stats.lowStock > 0 && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          {stats.lowStock} kit{stats.lowStock > 1 ? 's' : ''} need restocking
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Edit Program Dialog */}
          <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Program</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateProgram} className="space-y-4">
                <div>
                  <Label htmlFor="editProgramName">Program Name</Label>
                  <Input
                    id="editProgramName"
                    value={editProgramData.name}
                    onChange={(e) => setEditProgramData({ ...editProgramData, name: e.target.value })}
                    placeholder="e.g., Electronics, Mechanics"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editProgramDescription">Description (optional)</Label>
                  <Textarea
                    id="editProgramDescription"
                    value={editProgramData.description}
                    onChange={(e) => setEditProgramData({ ...editProgramData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="editProgramCategories">Categories (optional)</Label>
                  <Input
                    id="editProgramCategories"
                    value={editProgramData.categories}
                    onChange={(e) => setEditProgramData({ ...editProgramData, categories: e.target.value })}
                    placeholder="e.g., Explorer, Discoverer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated list of categories for this program
                  </p>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditProgramOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Program</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                {(programs ?? []).find(p => p.slug === selectedProgram)?.name || selectedProgram.toUpperCase()} Kits
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your {(programs ?? []).find(p => p.slug === selectedProgram)?.name || selectedProgram} kits inventory
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
                    <Label htmlFor="kitImage">Kit Image (optional)</Label>
                    <div className="space-y-2">
                      <Input
                        id="kitImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage && (
                        <p className="text-sm text-muted-foreground">Uploading image...</p>
                      )}
                      {(imagePreview || getImageUrl) && (
                        <div className="relative w-32 h-32 border rounded overflow-hidden">
                          <img
                            src={imagePreview || getImageUrl || ""}
                            alt="Kit preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Kit Type</Label>
                    <Select value={formData.type} onValueChange={(value: string) => 
                      setFormData({ ...formData, type: value, cstemVariant: value !== "cstem" ? undefined : formData.cstemVariant })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(programs ?? []).map((program) => (
                          <SelectItem key={program._id} value={program.slug}>
                            {program.name}
                          </SelectItem>
                        ))}
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
                  <th className="px-4 py-3 text-left text-sm font-medium">Remarks</th>
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
                        <td className="px-4 py-3 text-sm">
                          {kit.stockCount >= 0 ? (
                            <div>
                              <div className="font-medium">{kit.stockCount}</div>
                              <div className="text-xs text-muted-foreground">Available</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-red-600">{Math.abs(kit.stockCount)}</div>
                              <div className="text-xs text-red-600">To be Made</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={kit.stockCount <= kit.lowStockThreshold ? "destructive" : "default"} 
                            className="text-xs"
                          >
                            {kit.stockCount <= kit.lowStockThreshold ? "Low stock" : "In stock"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                          {editingRemarksKitId === kit._id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={remarksInput}
                                onChange={(e) => setRemarksInput(e.target.value)}
                                placeholder="Add remarks..."
                                className="h-8 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateKit({ id: kit._id, remarks: remarksInput });
                                    setEditingRemarksKitId(null);
                                    toast("Remarks updated");
                                  } else if (e.key === "Escape") {
                                    setEditingRemarksKitId(null);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  updateKit({ id: kit._id, remarks: remarksInput });
                                  setEditingRemarksKitId(null);
                                  toast("Remarks updated");
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingRemarksKitId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[32px] flex items-center"
                              onClick={() => {
                                setEditingRemarksKitId(kit._id);
                                setRemarksInput(kit.remarks || "");
                              }}
                            >
                              {kit.remarks ? (
                                <span className="text-sm">{kit.remarks}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Click to add remarks...</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex space-x-1">
                            {kit.image && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingImageKit(kit);
                                  setIsImageViewerOpen(true);
                                }}
                                title="View Kit Image"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            )}
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
                                openCopyDialog(kit);
                              }}
                              title="Copy to Another Program"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
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
                                      <div key={pIdx} className="border rounded p-3 bg-background">
                                        <div className="font-medium text-sm text-center mb-3 pb-2 border-b">{pouch.name}</div>
                                        <ul className="space-y-2 text-sm">
                                          {pouch.materials.map((material, mIdx) => (
                                            <li key={mIdx}>
                                              <div className="flex justify-between gap-2">
                                                <span className="flex-1 break-words">• {material.name}</span>
                                                <span className="flex-shrink-0 font-medium whitespace-nowrap">
                                                  {material.quantity} {material.unit}
                                                </span>
                                              </div>
                                              {material.notes && (
                                                <div className="text-muted-foreground ml-3 mt-0.5 italic text-xs">
                                                  {material.notes}
                                                </div>
                                              )}
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

      {/* Copy Kit Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Kit to Another Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Original Kit</Label>
              <Input value={copyingKit?.name || ""} disabled />
            </div>
            <div>
              <Label htmlFor="copyKitName">New Kit Name</Label>
              <Input
                id="copyKitName"
                value={copyKitName}
                onChange={(e) => setCopyKitName(e.target.value)}
                placeholder="Enter new kit name"
              />
            </div>
            <div>
              <Label htmlFor="targetProgram">Target Program</Label>
              <Select value={copyTargetProgram} onValueChange={setCopyTargetProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target program" />
                </SelectTrigger>
                <SelectContent>
                  {(programs ?? [])
                    .filter(p => p.slug !== copyingKit?.type)
                    .map((program) => (
                      <SelectItem key={program._id} value={program.slug}>
                        {program.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              The copied kit will start with 0 stock and retain all packing requirements.
            </p>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCopyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCopyKit}
                disabled={!copyTargetProgram}
              >
                Copy Kit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <KitSheetMaker 
        open={isKitSheetMakerOpen} 
        onOpenChange={(open) => {
          setIsKitSheetMakerOpen(open);
          if (!open) setEditingKitForSheetMaker(null);
        }}
        editingKit={editingKitForSheetMaker}
      />

      {viewingImageKit?.image && (
        <KitImageViewer
          open={isImageViewerOpen}
          onOpenChange={setIsImageViewerOpen}
          kitName={viewingImageKit.name}
          storageId={viewingImageKit.image}
        />
      )}
    </Layout>
  );
}