import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Minus, PlusCircle, ChevronDown, ChevronRight } from "lucide-react";

type Category = "raw_material" | "pre_processed" | "finished_good";

// Add subcategories for raw materials
const RAW_SUBCATEGORIES: Array<{ value: string; label: string }> = [
  { value: "electronics", label: "Electronics" },
  { value: "foam", label: "Foam" },
  { value: "mdf", label: "MDF" },
  { value: "fasteners", label: "Fasteners" },
  { value: "stationery", label: "Stationery" },
  { value: "tubes", label: "Tubes" },
  { value: "printable", label: "Printable" },
  { value: "corrugated_sheets", label: "Corrugated Sheets" },
];

const PRE_SUBCATEGORIES: Array<{ value: string; label: string }> = [
  { value: "laser_cut", label: "Laser Cut" },
  { value: "painted", label: "Painted" },
  { value: "assembled", label: "Assembled" },
];

const CATEGORY_LABELS: Record<Category, string> = {
  raw_material: "Raw Material",
  pre_processed: "Pre-Processed",
  finished_good: "Finished Goods",
};

export default function Inventory() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth");
  }, [isLoading, isAuthenticated, navigate]);

  const raw = useQuery(api.inventory.listByCategory, { category: "raw_material" });
  const pre = useQuery(api.inventory.listByCategory, { category: "pre_processed" });
  const kits = useQuery(api.kits.list, {});
  const assignments = useQuery(api.assignments.list, {});
  
  // Load custom categories
  const customRawCategories = useQuery(api.inventoryCategories.list, { categoryType: "raw_material" });
  const customPreCategories = useQuery(api.inventoryCategories.list, { categoryType: "pre_processed" });

  const createItem = useMutation(api.inventory.create);
  const adjustStock = useMutation(api.inventory.adjustStock);
  const removeItem = useMutation(api.inventory.remove);
  const createCategory = useMutation(api.inventoryCategories.create);
  const removeCategory = useMutation(api.inventoryCategories.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "raw_material" as Category,
    subCategory: "none",
    unit: "",
    quantity: 0,
    notes: "",
  });

  // Add: overall section collapse state
  const [rawSectionOpen, setRawSectionOpen] = useState<boolean>(true);
  const [preSectionOpen, setPreSectionOpen] = useState<boolean>(true);
  const [finSectionOpen, setFinSectionOpen] = useState<boolean>(true);

  // Add: quick add inline forms per section
  const [rawQuick, setRawQuick] = useState<{ name: string; subCategory: string; quantity: number; unit: string; notes: string }>({
    name: "",
    subCategory: "none",
    quantity: 0,
    unit: "",
    notes: "",
  });
  const [preQuick, setPreQuick] = useState<{ name: string; subCategory: string; quantity: number; unit: string; notes: string }>({
    name: "",
    subCategory: "none",
    quantity: 0,
    unit: "",
    notes: "",
  });
  const [finQuick, setFinQuick] = useState<{ name: string; quantity: number; unit: string; notes: string }>({
    name: "",
    quantity: 0,
    unit: "",
    notes: "",
  });

  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; id?: string; name?: string; delta: number }>({
    open: false,
    delta: 0,
  });

  // Add: collapse state for dropdown sections
  const [rawOpen, setRawOpen] = useState<Record<string, boolean>>({});
  const [preOpen, setPreOpen] = useState<Record<string, boolean>>({});
  const [rawUncatOpen, setRawUncatOpen] = useState<boolean>(false);
  const [preUncatOpen, setPreUncatOpen] = useState<boolean>(false);

  // Add state for new category dialog
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: "",
    value: "",
    categoryType: "raw_material" as "raw_material" | "pre_processed",
  });

  const totals = useMemo(() => {
    return {
      raw: raw?.reduce((s, i) => s + i.quantity, 0) ?? 0,
      pre: pre?.reduce((s, i) => s + i.quantity, 0) ?? 0,
      fin: kits?.reduce((s: number, k: any) => s + (k?.stockCount ?? 0), 0) ?? 0,
    };
  }, [raw, pre, kits]);

  // Compute pending (not yet dispatched) assigned quantity per kit
  const pendingByKit = useMemo(() => {
    const map: Record<string, number> = {};
    (assignments ?? []).forEach((a: any) => {
      // Treat anything not explicitly dispatched as pending
      const isPending = a.status !== "dispatched" && typeof a.dispatchedAt !== "number";
      if (!isPending) return;
      const key = String(a.kitId);
      map[key] = (map[key] ?? 0) + (a.quantity ?? 0);
    });
    return map;
  }, [assignments]);

  // Merge default and custom categories
  const allRawCategories = useMemo(() => {
    const custom = (customRawCategories ?? []).map(c => ({ value: c.value, label: c.name }));
    return [...RAW_SUBCATEGORIES, ...custom];
  }, [customRawCategories]);

  const allPreCategories = useMemo(() => {
    const custom = (customPreCategories ?? []).map(c => ({ value: c.value, label: c.name }));
    return [...PRE_SUBCATEGORIES, ...custom];
  }, [customPreCategories]);

  if (isLoading || !isAuthenticated) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem({
        name: createForm.name,
        category: createForm.category,
        ...(
          (createForm.category === "raw_material" || createForm.category === "pre_processed")
          && createForm.subCategory !== "none"
            ? { subCategory: createForm.subCategory as any }
            : {}
        ),
        unit: createForm.unit || undefined,
        quantity: createForm.quantity,
        notes: createForm.notes || undefined,
      } as any);
      toast("Item created");
      setIsCreateOpen(false);
      setCreateForm({ name: "", category: "raw_material", subCategory: "none", unit: "", quantity: 0, notes: "" });
    } catch (err) {
      toast("Failed to create item", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  // Add: quick add handlers
  const handleQuickAddRaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawQuick.name.trim()) return;
    try {
      await createItem({
        name: rawQuick.name.trim(),
        category: "raw_material",
        ...(rawQuick.subCategory !== "none" ? { subCategory: rawQuick.subCategory as any } : {}),
        unit: rawQuick.unit || undefined,
        quantity: Number.isFinite(rawQuick.quantity) ? rawQuick.quantity : 0,
        notes: rawQuick.notes || undefined,
      } as any);
      toast("Raw material added");
      setRawQuick({ name: "", subCategory: "none", quantity: 0, unit: "", notes: "" });
    } catch (err) {
      toast("Failed to add raw material", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleQuickAddPre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preQuick.name.trim()) return;
    try {
      await createItem({
        name: preQuick.name.trim(),
        category: "pre_processed",
        ...(preQuick.subCategory !== "none" ? { subCategory: preQuick.subCategory as any } : {}),
        unit: preQuick.unit || undefined,
        quantity: Number.isFinite(preQuick.quantity) ? preQuick.quantity : 0,
        notes: preQuick.notes || undefined,
      } as any);
      toast("Pre-processed item added");
      setPreQuick({ name: "", subCategory: "none", quantity: 0, unit: "", notes: "" });
    } catch (err) {
      toast("Failed to add pre-processed item", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleQuickAddFin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finQuick.name.trim()) return;
    try {
      await createItem({
        name: finQuick.name.trim(),
        category: "finished_good",
        unit: finQuick.unit || undefined,
        quantity: Number.isFinite(finQuick.quantity) ? finQuick.quantity : 0,
        notes: finQuick.notes || undefined,
      } as any);
      toast("Finished good added");
      setFinQuick({ name: "", quantity: 0, unit: "", notes: "" });
    } catch (err) {
      toast("Failed to add finished good", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory({
        name: newCategoryForm.name,
        value: newCategoryForm.value.toLowerCase().replace(/\s+/g, "_"),
        categoryType: newCategoryForm.categoryType,
      });
      toast("Category created");
      setIsAddCategoryOpen(false);
      setNewCategoryForm({ name: "", value: "", categoryType: "raw_material" });
    } catch (err) {
      toast("Failed to create category", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleAdjust = async () => {
    if (!adjustDialog.id) return;
    try {
      await adjustStock({ id: adjustDialog.id as any, delta: adjustDialog.delta });
      toast(adjustDialog.delta >= 0 ? "Stock added" : "Stock removed");
      setAdjustDialog({ open: false, delta: 0 });
    } catch (err) {
      toast("Failed to adjust stock", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await removeItem({ id: id as any });
      toast("Item deleted");
    } catch (err) {
      toast("Failed to delete item", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const CategoryCard = ({
    title,
    items,
  }: {
    title: string;
    items: Array<{ _id: string; name: string; unit?: string; quantity: number; notes?: string }>;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Badge variant="secondary">{items?.length ?? 0} items</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {(items ?? []).map((it) => (
          <div key={it._id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-muted-foreground">
                  Qty: {it.quantity} {it.unit ? it.unit : ""}
                </div>
                {it.notes ? <div className="text-xs text-muted-foreground mt-1">{it.notes}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: -1 })}
                  title="Remove stock"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: 1 })}
                  title="Add stock"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRemove(it._id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
        {items?.length === 0 ? (
          <div className="text-sm text-muted-foreground">No items yet.</div>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage raw materials, pre-processed items, and finished goods. Adjust stock in real time.
            </p>
          </div>

          <div className="flex gap-2">
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <Label htmlFor="categoryType">Category Type</Label>
                    <Select
                      value={newCategoryForm.categoryType}
                      onValueChange={(v: "raw_material" | "pre_processed") =>
                        setNewCategoryForm((s) => ({ ...s, categoryType: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw_material">Raw Material</SelectItem>
                        <SelectItem value="pre_processed">Pre-Processed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setNewCategoryForm((s) => ({
                          ...s,
                          name,
                          value: name.toLowerCase().replace(/\s+/g, "_"),
                        }));
                      }}
                      placeholder="e.g., 3D Printed"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="categoryValue">Category Value (auto-generated)</Label>
                    <Input
                      id="categoryValue"
                      value={newCategoryForm.value}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Inventory Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={createForm.category}
                      onValueChange={(v: Category) => setCreateForm((s) => ({ ...s, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw_material">{CATEGORY_LABELS.raw_material}</SelectItem>
                        <SelectItem value="pre_processed">{CATEGORY_LABELS.pre_processed}</SelectItem>
                        <SelectItem value="finished_good">{CATEGORY_LABELS.finished_good}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show subcategory select only when Raw Material is selected */}
                  {createForm.category === "raw_material" && (
                    <div>
                      <Label htmlFor="subCategory">Raw Material Subcategory</Label>
                      <Select
                        value={createForm.subCategory}
                        onValueChange={(v: string) => setCreateForm((s) => ({ ...s, subCategory: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allRawCategories.map((sc) => (
                            <SelectItem key={sc.value} value={sc.value}>
                              {sc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Show subcategory select when Pre-Processed is selected */}
                  {createForm.category === "pre_processed" && (
                    <div>
                      <Label htmlFor="subCategory">Pre-Processed Subcategory</Label>
                      <Select
                        value={createForm.subCategory}
                        onValueChange={(v: string) => setCreateForm((s) => ({ ...s, subCategory: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allPreCategories.map((sc) => (
                            <SelectItem key={sc.value} value={sc.value}>
                              {sc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={createForm.quantity}
                        onChange={(e) =>
                          setCreateForm((s) => ({ ...s, quantity: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value) }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit (optional)</Label>
                      <Input
                        id="unit"
                        value={createForm.unit}
                        onChange={(e) => setCreateForm((s) => ({ ...s, unit: e.target.value }))}
                        placeholder="kg, pcs, sheets"
                      />
                    </div>
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
          </div>

          <Dialog open={adjustDialog.open} onOpenChange={(o) => setAdjustDialog((s) => ({ ...s, open: o }))}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Adjust Stock{adjustDialog.name ? ` • ${adjustDialog.name}` : ""}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Label htmlFor="delta">Amount (positive to add, negative to remove)</Label>
                <Input
                  id="delta"
                  type="number"
                  value={adjustDialog.delta}
                  onChange={(e) =>
                    setAdjustDialog((s) => ({ ...s, delta: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value) }))
                  }
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAdjustDialog({ open: false, delta: 0 })}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdjust}>Apply</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stacked sections with collapsible headers and inline add forms */}
        <div className="space-y-6">
          {/* Raw Materials Section */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-4 border-b"
                onClick={() => setRawSectionOpen((o) => !o)}
                aria-expanded={rawSectionOpen}
              >
                <div className="flex items-center gap-2">
                  {rawSectionOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-base font-medium">
                    {`${CATEGORY_LABELS.raw_material} • Total: ${totals.raw}`}
                  </span>
                </div>
                <Badge variant="secondary">{raw?.length ?? 0} items</Badge>
              </button>

              {rawSectionOpen ? (
                <>
                  {/* Inline Add New (Raw) */}
                  <CardContent className="pt-4">
                    <form onSubmit={handleQuickAddRaw} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <Input
                        placeholder="Name"
                        value={rawQuick.name}
                        onChange={(e) => setRawQuick((s) => ({ ...s, name: e.target.value }))}
                        required
                      />
                      <Select
                        value={rawQuick.subCategory}
                        onValueChange={(v: string) => setRawQuick((s) => ({ ...s, subCategory: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allRawCategories.map((sc) => (
                            <SelectItem key={sc.value} value={sc.value}>
                              {sc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={rawQuick.quantity}
                        onChange={(e) =>
                          setRawQuick((s) => ({ ...s, quantity: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value) }))
                        }
                        required
                      />
                      <Input
                        placeholder="Unit (optional)"
                        value={rawQuick.unit}
                        onChange={(e) => setRawQuick((s) => ({ ...s, unit: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Notes (optional)"
                          value={rawQuick.notes}
                          onChange={(e) => setRawQuick((s) => ({ ...s, notes: e.target.value }))}
                          className="md:hidden"
                        />
                        <Button type="submit" className="w-full md:w-auto">
                          Add
                        </Button>
                      </div>
                      <Input
                        placeholder="Notes (optional)"
                        value={rawQuick.notes}
                        onChange={(e) => setRawQuick((s) => ({ ...s, notes: e.target.value }))}
                        className="hidden md:block md:col-span-4"
                      />
                    </form>
                  </CardContent>

                  {/* Existing Raw grouped by subcategory and Uncategorized */}
                  <CardContent className="space-y-4">
                    {allRawCategories.map((sc) => {
                      const group = (raw ?? []).filter((it) => it.subCategory === sc.value);
                      const open = rawOpen[sc.value] ?? false;
                      return (
                        <div key={sc.value} className="rounded-md border">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2"
                            onClick={() =>
                              setRawOpen((s) => ({ ...s, [sc.value]: !open }))
                            }
                            aria-expanded={open}
                          >
                            <div className="flex items-center gap-2">
                              {open ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{sc.label}</span>
                            </div>
                            <Badge variant="outline">
                              Total: {group.reduce((s, i) => s + i.quantity, 0)}
                            </Badge>
                          </button>

                          {open ? (
                            group.length === 0 ? (
                              <div className="px-3 pb-3 text-sm text-muted-foreground">No items yet.</div>
                            ) : (
                              <div className="px-3 pb-3 space-y-3">
                                {group.map((it) => (
                                  <div key={it._id} className="flex items-center justify-between rounded border p-3">
                                    <div>
                                      <div className="font-medium">{it.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {it.quantity} {it.unit ? it.unit : ""}
                                      </div>
                                      {it.notes ? (
                                        <div className="text-xs text-muted-foreground mt-1">{it.notes}</div>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: -1 })}
                                        title="Remove stock"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: 1 })}
                                        title="Add stock"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleRemove(it._id)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : null}
                        </div>
                      );
                    })}
                    {/* Uncategorized bucket */}
                    {(() => {
                      const uncategorized = (raw ?? []).filter((it) => !it.subCategory);
                      return (
                        <div className="rounded-md border">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2"
                            onClick={() => setRawUncatOpen((o) => !o)}
                            aria-expanded={rawUncatOpen}
                          >
                            <div className="flex items-center gap-2">
                              {rawUncatOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">Uncategorized</span>
                            </div>
                            <Badge variant="outline">Total: {uncategorized.reduce((s, i) => s + i.quantity, 0)}</Badge>
                          </button>

                          {rawUncatOpen ? (
                            uncategorized.length === 0 ? (
                              <div className="px-3 pb-3 text-sm text-muted-foreground">No items yet.</div>
                            ) : (
                              <div className="px-3 pb-3 space-y-3">
                                {uncategorized.map((it) => (
                                  <div key={it._id} className="flex items-center justify-between rounded border p-3">
                                    <div>
                                      <div className="font-medium">{it.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {it.quantity} {it.unit ? it.unit : ""}
                                      </div>
                                      {it.notes ? (
                                        <div className="text-xs text-muted-foreground mt-1">{it.notes}</div>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: -1 })}
                                        title="Remove stock"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: 1 })}
                                        title="Add stock"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleRemove(it._id)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : null}
                        </div>
                      );
                    })()}
                  </CardContent>
                </>
              ) : null}
            </Card>
          </motion.div>

          {/* Pre-Processed Section */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-4 border-b"
                onClick={() => setPreSectionOpen((o) => !o)}
                aria-expanded={preSectionOpen}
              >
                <div className="flex items-center gap-2">
                  {preSectionOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-base font-medium">
                    {`${CATEGORY_LABELS.pre_processed} • Total: ${totals.pre}`}
                  </span>
                </div>
                <Badge variant="secondary">{pre?.length ?? 0} items</Badge>
              </button>

              {preSectionOpen ? (
                <>
                  {/* Inline Add New (Pre) */}
                  <CardContent className="pt-4">
                    <form onSubmit={handleQuickAddPre} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <Input
                        placeholder="Name"
                        value={preQuick.name}
                        onChange={(e) => setPreQuick((s) => ({ ...s, name: e.target.value }))}
                        required
                      />
                      <Select
                        value={preQuick.subCategory}
                        onValueChange={(v: string) => setPreQuick((s) => ({ ...s, subCategory: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allPreCategories.map((sc) => (
                            <SelectItem key={sc.value} value={sc.value}>
                              {sc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={preQuick.quantity}
                        onChange={(e) =>
                          setPreQuick((s) => ({ ...s, quantity: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value) }))
                        }
                        required
                      />
                      <Input
                        placeholder="Unit (optional)"
                        value={preQuick.unit}
                        onChange={(e) => setPreQuick((s) => ({ ...s, unit: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Notes (optional)"
                          value={preQuick.notes}
                          onChange={(e) => setPreQuick((s) => ({ ...s, notes: e.target.value }))}
                          className="md:hidden"
                        />
                        <Button type="submit" className="w-full md:w-auto">
                          Add
                        </Button>
                      </div>
                      <Input
                        placeholder="Notes (optional)"
                        value={preQuick.notes}
                        onChange={(e) => setPreQuick((s) => ({ ...s, notes: e.target.value }))}
                        className="hidden md:block md:col-span-4"
                      />
                    </form>
                  </CardContent>

                  {/* Existing Pre grouped sections */}
                  <CardContent className="space-y-4">
                    {allPreCategories.map((sc) => {
                      const group = (pre ?? []).filter((it) => it.subCategory === sc.value);
                      const open = preOpen[sc.value] ?? false;
                      return (
                        <div key={sc.value} className="rounded-md border">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2"
                            onClick={() =>
                              setPreOpen((s) => ({ ...s, [sc.value]: !open }))
                            }
                            aria-expanded={open}
                          >
                            <div className="flex items-center gap-2">
                              {open ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{sc.label}</span>
                            </div>
                            <Badge variant="outline">
                              Total: {group.reduce((s, i) => s + i.quantity, 0)}
                            </Badge>
                          </button>

                          {open ? (
                            group.length === 0 ? (
                              <div className="px-3 pb-3 text-sm text-muted-foreground">No items yet.</div>
                            ) : (
                              <div className="px-3 pb-3 space-y-3">
                                {group.map((it) => (
                                  <div key={it._id} className="flex items-center justify-between rounded border p-3">
                                    <div>
                                      <div className="font-medium">{it.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {it.quantity} {it.unit ? it.unit : ""}
                                      </div>
                                      {it.notes ? (
                                        <div className="text-xs text-muted-foreground mt-1">{it.notes}</div>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: -1 })}
                                        title="Remove stock"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: 1 })}
                                        title="Add stock"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleRemove(it._id)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : null}
                        </div>
                      );
                    })}
                    {(() => {
                      const uncategorized = (pre ?? []).filter((it) => !it.subCategory);
                      return (
                        <div className="rounded-md border">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2"
                            onClick={() => setPreUncatOpen((o) => !o)}
                            aria-expanded={preUncatOpen}
                          >
                            <div className="flex items-center gap-2">
                              {preUncatOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">Uncategorized</span>
                            </div>
                            <Badge variant="outline">Total: {uncategorized.reduce((s, i) => s + i.quantity, 0)}</Badge>
                          </button>

                          {preUncatOpen ? (
                            uncategorized.length === 0 ? (
                              <div className="px-3 pb-3 text-sm text-muted-foreground">No items yet.</div>
                            ) : (
                              <div className="px-3 pb-3 space-y-3">
                                {uncategorized.map((it) => (
                                  <div key={it._id} className="flex items-center justify-between rounded border p-3">
                                    <div>
                                      <div className="font-medium">{it.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {it.quantity} {it.unit ? it.unit : ""}
                                      </div>
                                      {it.notes ? (
                                        <div className="text-xs text-muted-foreground mt-1">{it.notes}</div>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: -1 })}
                                        title="Remove stock"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAdjustDialog({ open: true, id: it._id, name: it.name, delta: 1 })}
                                        title="Add stock"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleRemove(it._id)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : null}
                        </div>
                      );
                    })()}
                  </CardContent>
                </>
              ) : null}
            </Card>
          </motion.div>

          {/* Finished Goods Section */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-4 border-b"
                onClick={() => setFinSectionOpen((o) => !o)}
                aria-expanded={finSectionOpen}
              >
                <div className="flex items-center gap-2">
                  {finSectionOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-base font-medium">
                    {`${CATEGORY_LABELS.finished_good} • Total: ${totals.fin}`}
                  </span>
                </div>
                <Badge variant="secondary">{kits?.length ?? 0} items</Badge>
              </button>

              {finSectionOpen ? (
                <>
                  {/* Finished goods are Kits -> provide manage CTA instead of inline inventory form */}
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Finished Goods are managed as Kits. Edit stock and materials in the Kits section.
                      </p>
                      <Button onClick={() => navigate("/kits")}>Manage Kits</Button>
                    </div>
                  </CardContent>

                  {/* Kits list */}
                  <CardContent className="space-y-3">
                    {(kits ?? []).map((k: any) => {
                      const pending = pendingByKit[String(k._id)] ?? 0;
                      const leftover = (k?.stockCount ?? 0) - pending;
                      return (
                        <div key={k._id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{k.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Type: {k.type} • In Stock: {k.stockCount}
                              </div>
                              <div className="text-xs mt-1">
                                Assigned (pending): {pending} • Leftover after fulfill: {leftover}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => navigate("/kits")}>
                                Open in Kits
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(kits ?? []).length === 0 ? (
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div className="text-sm text-muted-foreground">No kits yet.</div>
                        <Button size="sm" onClick={() => navigate("/kits")}>Create Kit</Button>
                      </div>
                    ) : null}
                  </CardContent>
                </>
              ) : null}
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}