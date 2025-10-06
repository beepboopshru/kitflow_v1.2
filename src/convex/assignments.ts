import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    kitId: v.id("kits"),
    clientId: v.id("clients"),
    quantity: v.number(),
    notes: v.optional(v.string()),
    grade: v.optional(v.number()),
    dispatchedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const kit = await ctx.db.get(args.kitId);
    if (!kit || kit.stockCount < args.quantity) {
      throw new Error("Insufficient stock");
    }

    const assignmentId = await ctx.db.insert("assignments", {
      kitId: args.kitId,
      clientId: args.clientId,
      quantity: args.quantity,
      notes: args.notes,
      grade: args.grade,
      status: "assigned" as const,
      assignedBy: user._id,
      assignedAt: Date.now(),
      dispatchedAt: args.dispatchedAt,
    });

    await ctx.db.patch(args.kitId, {
      stockCount: kit.stockCount - args.quantity,
      status: kit.stockCount - args.quantity === 0 ? "assigned" as const : "in_stock" as const,
    });

    return assignmentId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("assignments").collect();
    
    // Fetch related kit and client data
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const kit = await ctx.db.get(assignment.kitId);
        const client = await ctx.db.get(assignment.clientId);
        return {
          ...assignment,
          kit,
          client,
        };
      })
    );

    return enrichedAssignments;
  },
});

export const getByClient = query({
  args: { clientId: v.optional(v.id("clients")) },
  handler: async (ctx, args) => {
    if (!args.clientId) {
      return [];
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
      .collect();

    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const kit = await ctx.db.get(assignment.kitId);
        return {
          ...assignment,
          kit,
        };
      })
    );

    return enrichedAssignments;
  },
});

export const getByClientOptional = query({
  args: { clientId: v.optional(v.id("clients")) },
  handler: async (ctx, args) => {
    if (!args.clientId) {
      return [];
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
      .collect();

    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const kit = await ctx.db.get(assignment.kitId);
        return {
          ...assignment,
          kit,
        };
      })
    );

    return enrichedAssignments;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("assignments"),
    status: v.union(v.literal("assigned"), v.literal("packed"), v.literal("dispatched")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Assignment not found");

    // If marking as dispatched, deduct materials from inventory
    if (args.status === "dispatched" && assignment.status !== "dispatched") {
      const kit = await ctx.db.get(assignment.kitId);
      if (!kit) throw new Error("Kit not found");

      // Only process if kit has structured packing requirements
      if (kit.isStructured && kit.packingRequirements) {
        try {
          const pouches = JSON.parse(kit.packingRequirements);
          
          // Collect all materials across all pouches
          const materialsToDeduct: Array<{ name: string; quantity: number }> = [];
          for (const pouch of pouches) {
            if (pouch.materials && Array.isArray(pouch.materials)) {
              for (const material of pouch.materials) {
                materialsToDeduct.push({
                  name: material.name,
                  quantity: material.quantity * assignment.quantity, // multiply by assignment quantity
                });
              }
            }
          }

          // Deduct from inventory
          for (const material of materialsToDeduct) {
            // Find inventory item by name (case-insensitive search)
            const allInventory = await ctx.db.query("inventory").collect();
            const inventoryItem = allInventory.find(
              (item) => item.name.toLowerCase() === material.name.toLowerCase()
            );

            if (inventoryItem) {
              const newQty = inventoryItem.quantity - material.quantity;
              if (newQty < 0) {
                console.warn(
                  `Warning: Inventory for "${material.name}" would go negative (${newQty}). Setting to 0.`
                );
                await ctx.db.patch(inventoryItem._id, { quantity: 0 });
              } else {
                await ctx.db.patch(inventoryItem._id, { quantity: newQty });
              }
            } else {
              console.warn(
                `Warning: Material "${material.name}" not found in inventory. Skipping deduction.`
              );
            }
          }
        } catch (e) {
          console.error("Error processing kit materials for inventory deduction:", e);
          // Continue with status update even if inventory deduction fails
        }
      }
    }

    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.status === "dispatched" ? { dispatchedAt: Date.now() } : {}),
    });
  },
});

export const setDispatchDateForClientMonth = mutation({
  args: {
    clientId: v.id("clients"),
    month: v.string(), // format: "YYYY-MM"
    dispatchedAt: v.number(), // epoch ms
    markDispatched: v.optional(v.boolean()),
    grade: v.optional(v.union(v.number(), v.literal("unspecified"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const rows = await ctx.db
      .query("assignments")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    let updatedCount = 0;
    for (const a of rows) {
      const d = new Date(a.assignedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== args.month) continue;

      // Apply grade filter if provided
      if (args.grade !== undefined) {
        if (args.grade === "unspecified") {
          if (typeof a.grade !== "undefined") continue;
        } else {
          if (a.grade !== args.grade) continue;
        }
      }

      await ctx.db.patch(a._id, {
        dispatchedAt: args.dispatchedAt,
        ...(args.markDispatched ? { status: "dispatched" as const } : {}),
        updatedAt: Date.now(),
      });
      updatedCount++;
    }
    return { updatedCount };
  },
});

export const clearDispatchDateForClientMonth = mutation({
  args: {
    clientId: v.id("clients"),
    month: v.string(), // "YYYY-MM"
    grade: v.optional(v.union(v.number(), v.literal("unspecified"))),
    markAssigned: v.optional(v.boolean()), // optionally revert status to "assigned"
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const rows = await ctx.db
      .query("assignments")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    let updatedCount = 0;
    for (const a of rows) {
      const d = new Date(a.assignedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== args.month) continue;

      // Apply grade filter if provided
      if (args.grade !== undefined) {
        if (args.grade === "unspecified") {
          if (typeof a.grade !== "undefined") continue;
        } else {
          if (a.grade !== args.grade) continue;
        }
      }

      await ctx.db.patch(a._id, {
        dispatchedAt: undefined,
        ...(args.markAssigned ? { status: "assigned" as const } : {}),
        updatedAt: Date.now(),
      });
      updatedCount++;
    }
    return { updatedCount };
  },
});

export const clearPendingByKit = mutation({
  args: {
    kitId: v.id("kits"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Fetch all assignments for this kit
    const rows = await ctx.db
      .query("assignments")
      .withIndex("by_kit", (q) => q.eq("kitId", args.kitId))
      .collect();

    // Identify pending ones (anything not dispatched)
    const pending = rows.filter((a) => a.status !== "dispatched" && typeof a.dispatchedAt !== "number");
    if (pending.length === 0) {
      return { deletedCount: 0, restoredQty: 0 };
    }

    // Sum quantity to restore and delete assignments
    let restoredQty = 0;
    for (const a of pending) {
      restoredQty += a.quantity ?? 0;
      await ctx.db.delete(a._id);
    }

    // Restore kit stock and status
    const kit = await ctx.db.get(args.kitId);
    if (!kit) throw new Error("Kit not found");
    const newStock = (kit.stockCount ?? 0) + restoredQty;

    await ctx.db.patch(args.kitId, {
      stockCount: newStock,
      status: newStock === 0 ? ("assigned" as const) : ("in_stock" as const),
      // updatedAt for kit is not tracked in schema; skip
    });

    return { deletedCount: pending.length, restoredQty };
  },
});