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
import { Plus, Minus, PlusCircle } from "lucide-react";

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
  { value: "cnc", label: "CNC Machined" },
  { value: "3d_printed", label: "3D Printed" },
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
  const fin = useQuery(api.inventory.listByCategory, { category: "finished_good" });

  const createItem = useMutation(api.inventory.create);
  const adjustStock = useMutation(api.inventory.adjustStock);
  const removeItem = useMutation(api.inventory.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "raw_material" as Category,
    subCategory: "none",
    unit: "",
    quantity: 0,
    notes: "",
  });

  const totals = useMemo(() => {
    return {
      raw: raw?.reduce((s, i) => s + i.quantity, 0) ?? 0,
      pre: pre?.reduce((s, i) => s + i.quantity, 0) ?? 0,
      fin: fin?.reduce((s, i) => s + i.quantity, 0) ?? 0,
    };
  }, [raw, pre, fin]);

  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; id?: string; name?: string; delta: number }>({
    open: false,
    delta: 0,
  });

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
                        {RAW_SUBCATEGORIES.map((sc) => (
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
                        {PRE_SUBCATEGORIES.map((sc) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Raw materials grouped by subcategory */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  {`${CATEGORY_LABELS.raw_material} • Total: ${totals.raw}`}
                </CardTitle>
                <Badge variant="secondary">{raw?.length ?? 0} items</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subcategory sections */}
                {RAW_SUBCATEGORIES.map((sc) => {
                  const group = (raw ?? []).filter((it) => it.subCategory === sc.value);
                  return (
                    <div key={sc.value} className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{sc.label}</div>
                        <Badge variant="outline">Total: {group.reduce((s, i) => s + i.quantity, 0)}</Badge>
                      </div>
                      {group.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No items yet.</div>
                      ) : (
                        <div className="space-y-3">
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
                      )}
                    </div>
                  );
                })}
                {/* Uncategorized bucket */}
                {(() => {
                  const uncategorized = (raw ?? []).filter((it) => !it.subCategory);
                  return (
                    <div className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Uncategorized</div>
                        <Badge variant="outline">Total: {uncategorized.reduce((s, i) => s + i.quantity, 0)}</Badge>
                      </div>
                      {uncategorized.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No items yet.</div>
                      ) : (
                        <div className="space-y-3">
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
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  {`${CATEGORY_LABELS.pre_processed} • Total: ${totals.pre}`}
                </CardTitle>
                <Badge variant="secondary">{pre?.length ?? 0} items</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {PRE_SUBCATEGORIES.map((sc) => {
                  const group = (pre ?? []).filter((it) => it.subCategory === sc.value);
                  return (
                    <div key={sc.value} className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{sc.label}</div>
                        <Badge variant="outline">Total: {group.reduce((s, i) => s + i.quantity, 0)}</Badge>
                      </div>
                      {group.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No items yet.</div>
                      ) : (
                        <div className="space-y-3">
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
                      )}
                    </div>
                  );
                })}
                {(() => {
                  const uncategorized = (pre ?? []).filter((it) => !it.subCategory);
                  return (
                    <div className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Uncategorized</div>
                        <Badge variant="outline">Total: {uncategorized.reduce((s, i) => s + i.quantity, 0)}</Badge>
                      </div>
                      {uncategorized.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No items yet.</div>
                      ) : (
                        <div className="space-y-3">
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
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <CategoryCard title={`${CATEGORY_LABELS.finished_good} • Total: ${totals.fin}`} items={fin ?? []} />
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}