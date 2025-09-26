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
      // When no clientId provided (e.g., query is skipped), return an empty array
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

    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});