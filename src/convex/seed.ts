import { internalMutation } from "./_generated/server";

export const seedData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Prevent duplicate seeding
    const existing = await ctx.db.query("kits").collect();
    if (existing.length > 0) {
      return { message: "Seed already applied. Skipping." };
    }

    // Create a seed user to attribute data creation
    const seedUserId = await ctx.db.insert("users", {
      name: "Seed User",
      email: "seed@example.com",
    });

    // Seed Kits
    const arduinoId = await ctx.db.insert("kits", {
      name: "Arduino Starter Kit",
      type: "cstem",
      description: "Basic Arduino kit with sensors and components",
      stockCount: 25,
      lowStockThreshold: 5,
      packingRequirements: "1 Arduino board, 5 sensors, 1 breadboard, jumper wires",
      status: "in_stock",
      createdBy: seedUserId,
    });

    const roboticsId = await ctx.db.insert("kits", {
      name: "Robotics Expansion Kit",
      type: "robotics",
      description: "Advanced robotics kit with controllers and actuators",
      stockCount: 10,
      lowStockThreshold: 3,
      packingRequirements: "2 controllers, 8 servos, 1 battery pack",
      status: "in_stock",
      createdBy: seedUserId,
    });

    // Seed Clients
    const client1Id = await ctx.db.insert("clients", {
      name: "John Doe",
      organization: "STEM Academy",
      contact: "555-1234",
      type: "monthly",
      email: "john@example.com",
      notes: "Prefers Tuesday deliveries",
      createdBy: seedUserId,
    });

    const client2Id = await ctx.db.insert("clients", {
      name: "Jane Smith",
      organization: "Robo Club",
      contact: "555-5678",
      type: "one_time",
      email: "jane@example.com",
      notes: "N/A",
      createdBy: seedUserId,
    });

    // Seed Assignments
    await ctx.db.insert("assignments", {
      kitId: arduinoId,
      clientId: client1Id,
      quantity: 2,
      status: "assigned",
      notes: "Starter batch",
      assignedBy: seedUserId,
      assignedAt: Date.now(),
    });

    await ctx.db.insert("assignments", {
      kitId: roboticsId,
      clientId: client2Id,
      quantity: 1,
      status: "packed",
      notes: "Urgent",
      assignedBy: seedUserId,
      assignedAt: Date.now(),
    });

    // Update kit stock to reflect assignments
    await ctx.db.patch(arduinoId, { stockCount: 23, status: "in_stock" });
    await ctx.db.patch(roboticsId, { stockCount: 9, status: "in_stock" });

    return {
      message: "Seed complete",
      kits: [arduinoId, roboticsId],
      clients: [client1Id, client2Id],
    };
  },
});
