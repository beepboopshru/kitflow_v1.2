import { query } from "./_generated/server";

export const getInventorySummary = query({
  args: {},
  handler: async (ctx) => {
    const kits = await ctx.db.query("kits").collect();
    const assignments = await ctx.db.query("assignments").collect();

    const totalKits = kits.length;
    const totalStock = kits.reduce((sum, kit) => sum + kit.stockCount, 0);
    const lowStockKits = kits.filter(kit => kit.stockCount <= kit.lowStockThreshold).length;

    const assignedCount = assignments.filter(a => a.status === "assigned").length;
    const packedCount = assignments.filter(a => a.status === "packed").length;
    const dispatchedCount = assignments.filter(a => a.status === "dispatched").length;

    // Dynamic stock by program type
    const stockByType: Record<string, number> = {};
    kits.forEach(kit => {
      if (!stockByType[kit.type]) {
        stockByType[kit.type] = 0;
      }
      stockByType[kit.type] += kit.stockCount;
    });

    return {
      totalKits,
      totalStock,
      lowStockKits,
      assignedCount,
      packedCount,
      dispatchedCount,
      stockByType,
      // Keep legacy fields for backward compatibility
      cstemStock: stockByType["cstem"] || 0,
      roboticsStock: stockByType["robotics"] || 0,
    };
  },
});

export const getClientAllocation = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const assignments = await ctx.db.query("assignments").collect();

    // Get current month boundaries
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const clientAllocations = await Promise.all(
      clients.map(async (client) => {
        const clientAssignments = assignments.filter(a => a.clientId === client._id);
        const totalAssigned = clientAssignments.reduce((sum, a) => sum + a.quantity, 0);
        
        // Filter for upcoming dispatches in current month (not yet dispatched)
        const upcomingThisMonth = clientAssignments.filter(a => {
          // Check if dispatchedAt is set and falls in current month
          if (typeof a.dispatchedAt === "number") {
            const isInCurrentMonth = a.dispatchedAt >= currentMonthStart && a.dispatchedAt <= currentMonthEnd;
            // Not yet dispatched (status is not "dispatched")
            const notYetDispatched = a.status !== "dispatched";
            return isInCurrentMonth && notYetDispatched;
          }
          return false;
        });

        const upcomingQty = upcomingThisMonth.reduce((sum, a) => sum + a.quantity, 0);

        return {
          client,
          totalAssigned,
          assignments: clientAssignments.length,
          packed: clientAssignments.filter(a => a.status === "packed").length,
          dispatched: clientAssignments.filter(a => a.status === "dispatched").length,
          upcomingThisMonth: upcomingThisMonth.length,
          upcomingQty,
        };
      })
    );

    return clientAllocations;
  },
});