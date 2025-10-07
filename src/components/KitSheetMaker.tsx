import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, ChevronRight, ChevronLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Material {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface Pouch {
  name: string;
  materials: Material[];
}

interface KitSheetMakerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingKit?: any;
}

export function KitSheetMaker({ open, onOpenChange, editingKit }: KitSheetMakerProps) {
  const [step, setStep] = useState(1);
  const [kitName, setKitName] = useState("");
  const [kitType, setKitType] = useState<string>("cstem");
  const [cstemVariant, setCstemVariant] = useState<"explorer" | "discoverer" | undefined>(undefined);
  const [pouches, setPouches] = useState<Pouch[]>([]);
  const [stockCount, setStockCount] = useState(0);
  
  // Pouch builder state
  const [showPouchBuilder, setShowPouchBuilder] = useState(false);
  const [editingPouchIndex, setEditingPouchIndex] = useState<number | null>(null);
  const [pouchName, setPouchName] = useState("");
  const [pouchMaterials, setPouchMaterials] = useState<Material[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [itemQuantity, setItemQuantity] = useState<number | "">("");
  const [itemNotes, setItemNotes] = useState("");

  const rawMaterials = useQuery(api.inventory.listByCategory, { category: "raw_material" });
  const preProcessed = useQuery(api.inventory.listByCategory, { category: "pre_processed" });
  const finishedGoods = useQuery(api.inventory.listByCategory, { category: "finished_good" });
  const programs = useQuery(api.programs.list);
  
  const createKit = useMutation(api.kits.create);
  const updateKit = useMutation(api.kits.update);

  const allInventoryItems = [
    ...(rawMaterials ?? []).map(i => ({ ...i, category: "Raw" })),
    ...(preProcessed ?? []).map(i => ({ ...i, category: "Pre-Processed" })),
    ...(finishedGoods ?? []).map(i => ({ ...i, category: "Finished" })),
  ];

  // Load editing kit data when dialog opens
  useEffect(() => {
    if (open && editingKit) {
      setKitName(editingKit.name);
      setKitType(editingKit.type);
      setCstemVariant(editingKit.cstemVariant);
      setStockCount(editingKit.stockCount);
      if (editingKit.isStructured && editingKit.packingRequirements) {
        try {
          const parsed = JSON.parse(editingKit.packingRequirements);
          setPouches(parsed);
        } catch {
          setPouches([]);
        }
      }
    }
  }, [open, editingKit]);

  const resetForm = () => {
    setStep(1);
    setKitName("");
    setKitType("cstem");
    setCstemVariant(undefined);
    setPouches([]);
    setStockCount(0);
    setPouchName("");
    setPouchMaterials([]);
    setSelectedItem("");
    setItemQuantity("");
    setItemNotes("");
    setEditingPouchIndex(null);
  };

  const handleAddMaterialToPouch = () => {
    if (!selectedItem) {
      toast("Please select a material");
      return;
    }
    
    if (!itemQuantity || itemQuantity <= 0) {
      toast("Please enter a valid quantity");
      return;
    }
    
    const item = allInventoryItems.find(i => i._id === selectedItem);
    if (!item) return;

    const newMaterial: Material = {
      name: item.name,
      quantity: itemQuantity as number,
      unit: item.unit || "units",
      notes: itemNotes.trim() || undefined,
    };

    setPouchMaterials([...pouchMaterials, newMaterial]);
    setSelectedItem("");
    setItemQuantity("");
    setItemNotes("");
    toast("Material added to pouch");
  };

  const handleRemoveMaterialFromPouch = (index: number) => {
    setPouchMaterials(pouchMaterials.filter((_, i) => i !== index));
  };

  const handleSavePouch = () => {
    if (!pouchName.trim()) {
      toast("Please enter a pouch name");
      return;
    }
    if (pouchMaterials.length === 0) {
      toast("Please add at least one material to the pouch");
      return;
    }

    const newPouch: Pouch = {
      name: pouchName,
      materials: pouchMaterials,
    };

    if (editingPouchIndex !== null) {
      const updated = [...pouches];
      updated[editingPouchIndex] = newPouch;
      setPouches(updated);
      toast("Pouch updated");
    } else {
      setPouches([...pouches, newPouch]);
      toast("Pouch added");
    }

    setPouchName("");
    setPouchMaterials([]);
    setItemNotes("");
    setShowPouchBuilder(false);
    setEditingPouchIndex(null);
  };

  const handleEditPouch = (index: number) => {
    const pouch = pouches[index];
    setPouchName(pouch.name);
    setPouchMaterials([...pouch.materials]);
    setEditingPouchIndex(index);
    setShowPouchBuilder(true);
  };

  const handleRemovePouch = (index: number) => {
    setPouches(pouches.filter((_, i) => i !== index));
    toast("Pouch removed");
  };

  const handleFinalSave = async () => {
    if (!kitName.trim()) {
      toast("Please enter a kit name");
      return;
    }

    try {
      const structuredData = JSON.stringify(pouches);
      
      if (editingKit) {
        await updateKit({
          id: editingKit._id,
          name: kitName,
          type: kitType,
          cstemVariant: kitType === "cstem" ? cstemVariant : undefined,
          stockCount: stockCount,
          packingRequirements: structuredData,
          isStructured: true,
        });
        toast("Kit updated successfully!");
      } else {
        await createKit({
          name: kitName,
          type: kitType,
          cstemVariant: kitType === "cstem" ? cstemVariant : undefined,
          stockCount: stockCount,
          lowStockThreshold: 5,
          packingRequirements: structuredData,
          isStructured: true,
        });
        toast("Kit created successfully!");
      }
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast(editingKit ? "Error updating kit" : "Error creating kit", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) resetForm();
    }}>
      <DialogContent 
        className="max-w-5xl max-h-[95vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editingKit ? "Edit" : "Create"} Kit Sheet - Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="kitName">Kit Name</Label>
              <Input
                id="kitName"
                value={kitName}
                onChange={(e) => setKitName(e.target.value)}
                placeholder="Enter kit name"
              />
            </div>
            <div>
              <Label htmlFor="kitType">Kit Type</Label>
              <Select value={kitType} onValueChange={(v: string) => {
                setKitType(v);
                if (v !== "cstem") {
                  setCstemVariant(undefined);
                }
              }}>
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

            {kitType === "cstem" && (
              <div>
                <Label htmlFor="cstemCategory">Category</Label>
                <Select 
                  value={cstemVariant || ""} 
                  onValueChange={(v: "explorer" | "discoverer") => setCstemVariant(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="explorer">Explorer</SelectItem>
                    <SelectItem value="discoverer">Discoverer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!kitName.trim() || (kitType === "cstem" && !cstemVariant)}
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Add Pouches */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Pouches & Materials</h3>
              <Button onClick={() => setShowPouchBuilder(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Pouch
              </Button>
            </div>

            {/* Pouch Builder Dialog */}
            {showPouchBuilder && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="text-base">
                    {editingPouchIndex !== null ? "Edit Pouch" : "New Pouch"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Pouch Name</Label>
                    <Input
                      value={pouchName}
                      onChange={(e) => setPouchName(e.target.value)}
                      placeholder="e.g., Electronics Pack"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Materials in this pouch</Label>
                    {pouchMaterials.map((material, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {material.name} - {material.quantity} {material.unit}
                          </span>
                          {material.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{material.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMaterialFromPouch(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label>Select Material</Label>
                        <Select value={selectedItem} onValueChange={setSelectedItem}>
                          <SelectTrigger>
                            <SelectValue placeholder="Search inventory..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allInventoryItems.map((item) => (
                              <SelectItem key={item._id} value={item._id}>
                                <div className="flex flex-col gap-0.5 py-1">
                                  <span className="break-words">{item.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.category} • {item.quantity} available
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Enter quantity"
                          value={itemQuantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItemQuantity(val === "" ? "" : parseInt(val) || "");
                          }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Notes (optional)</Label>
                      <Input
                        placeholder="Add notes for this material..."
                        value={itemNotes}
                        onChange={(e) => setItemNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={handleAddMaterialToPouch} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material to Pouch
                  </Button>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSavePouch} className="flex-1">
                      Save Pouch
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                      setShowPouchBuilder(false);
                      setPouchName("");
                      setPouchMaterials([]);
                      setItemNotes("");
                      setEditingPouchIndex(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pouches List */}
            <div className="space-y-2">
              {pouches.map((pouch, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{pouch.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditPouch(idx)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemovePouch(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pouch.materials.map((material, mIdx) => (
                        <div key={mIdx} className="text-xs">
                          <div className="text-muted-foreground">
                            • {material.name} - {material.quantity} {material.unit}
                          </div>
                          {material.notes && (
                            <div className="text-muted-foreground/80 ml-3 italic">
                              {material.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {pouches.length === 0 && !showPouchBuilder && (
              <div className="text-center py-8 text-muted-foreground">
                No pouches added yet. Click "Add Pouch" to start.
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={pouches.length === 0}>
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Finalize */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Kit Name:</span>
                <p className="font-medium">{kitName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type:</span>
                <Badge className="ml-2">
                  {kitType === "cstem" && cstemVariant 
                    ? cstemVariant.toUpperCase() 
                    : kitType.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Pouches:</span>
                <p className="font-medium">{pouches.length}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="stockCount">Initial Stock Count (optional)</Label>
              <Input
                id="stockCount"
                type="number"
                min="0"
                value={stockCount}
                onChange={(e) => setStockCount(parseInt(e.target.value) || 0)}
                placeholder="Leave 0 if not ready"
              />
            </div>

            <div className="space-y-2">
              <Label>Pouches Summary:</Label>
              {pouches.map((pouch, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{pouch.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-2">
                      {pouch.materials.map((m, mIdx) => (
                        <li key={mIdx}>
                          <div>• {m.name} - {m.quantity} {m.unit}</div>
                          {m.notes && (
                            <div className="text-muted-foreground ml-3 italic mt-0.5">
                              {m.notes}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleFinalSave}>
                Save Kit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}