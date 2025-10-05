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

    // Seed Inventory
    await ctx.db.insert("inventory", {
      name: "Aluminum Sheets",
      category: "raw_material",
      unit: "sheets",
      quantity: 120,
      notes: "2mm thickness",
      createdBy: seedUserId,
    });
    await ctx.db.insert("inventory", {
      name: "Cut Gears",
      category: "pre_processed",
      unit: "pcs",
      quantity: 35,
      notes: "Laser cut",
      createdBy: seedUserId,
    });
    await ctx.db.insert("inventory", {
      name: "Robot Chassis Kit",
      category: "finished_good",
      unit: "kits",
      quantity: 15,
      notes: "Ready to ship",
      createdBy: seedUserId,
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

export const seedSpecificInventoryItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    if (!user) throw new Error("No user found");

    const items = [
      { name: "Cardboard tube", category: "raw_material" as const, subCategory: "tubes", unit: "pcs", quantity: 100, notes: "180mm with -6mm hole(from bottom side at 3 cm)", createdBy: user._id },
      { name: "Tube sticker", category: "raw_material" as const, subCategory: "stationery", unit: "pcs", quantity: 100, notes: "logo sticker to be attached", createdBy: user._id },
      { name: "Mirror", category: "raw_material" as const, subCategory: "uncategorized", unit: "pcs", quantity: 50, notes: "48mm Dia with middle 2 Slot", createdBy: user._id },
      { name: "Plastic container", category: "raw_material" as const, subCategory: "uncategorized", unit: "pcs", quantity: 50, notes: "50mm with 2 hole(Single Dabbi -33)", createdBy: user._id },
      { name: "Glitter tape", category: "raw_material" as const, subCategory: "stationery", unit: "rolls", quantity: 20, notes: "12mm", createdBy: user._id },
      { name: "Battery", category: "raw_material" as const, subCategory: "electronics", unit: "pcs", quantity: 100, notes: "9v", createdBy: user._id },
      { name: "Cardboard tube cap", category: "raw_material" as const, subCategory: "tubes", unit: "pcs", quantity: 100, notes: "50mm - without hole", createdBy: user._id },
      { name: "Templates", category: "raw_material" as const, subCategory: "printable", unit: "sheets", quantity: 50, notes: "Shadow Templates 300 gsm (Moon & Star)", createdBy: user._id },
      { name: "Skewer", category: "raw_material" as const, subCategory: "uncategorized", unit: "pcs", quantity: 200, notes: "full length-150mm", createdBy: user._id },
      { name: "Battery Snap", category: "raw_material" as const, subCategory: "electronics", unit: "pcs", quantity: 100, notes: "Snap with 100ohm resistor", createdBy: user._id },
      { name: "LED", category: "raw_material" as const, subCategory: "electronics", unit: "pcs", quantity: 100, notes: "1w SMD (white) LED with 200mm wire 20mm strip", createdBy: user._id },
      { name: "Push Switch", category: "raw_material" as const, subCategory: "electronics", unit: "pcs", quantity: 100, notes: "Push with 100 mm wire", createdBy: user._id },
      { name: "Washer", category: "raw_material" as const, subCategory: "fasteners", unit: "pcs", quantity: 200, notes: "M4/11", createdBy: user._id },
      { name: "Double side tape", category: "raw_material" as const, subCategory: "stationery", unit: "pcs", quantity: 50, notes: "10*10mm", createdBy: user._id },
      { name: "Insulation Tape", category: "raw_material" as const, subCategory: "stationery", unit: "rolls", quantity: 30, notes: "12mm*100mm (sand blast sheet)", createdBy: user._id },
    ];

    for (const item of items) {
      await ctx.db.insert("inventory", item);
    }

    return { count: items.length };
  },
});