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

    const cstemKits = kits.filter(kit => kit.type === "cstem");
    const roboticsKits = kits.filter(kit => kit.type === "robotics");

    return {
      totalKits,
      totalStock,
      lowStockKits,
      assignedCount,
      packedCount,
      dispatchedCount,
      cstemStock: cstemKits.reduce((sum, kit) => sum + kit.stockCount, 0),
      roboticsStock: roboticsKits.reduce((sum, kit) => sum + kit.stockCount, 0),
    };
  },
});

export const getClientAllocation = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const assignments = await ctx.db.query("assignments").collect();

    const clientAllocations = await Promise.all(
      clients.map(async (client) => {
        const clientAssignments = assignments.filter(a => a.clientId === client._id);
        const totalAssigned = clientAssignments.reduce((sum, a) => sum + a.quantity, 0);
        
        return {
          client,
          totalAssigned,
          assignments: clientAssignments.length,
          packed: clientAssignments.filter(a => a.status === "packed").length,
          dispatched: clientAssignments.filter(a => a.status === "dispatched").length,
        };
      })
    );

    return clientAllocations;
  },
});
