import { internalMutation } from "./_generated/server";

export const seedInitialPrograms = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if programs already exist
    const existing = await ctx.db.query("programs").first();
    if (existing) {
      return { message: "Programs already seeded" };
    }

    // Get first user as creator (or use system)
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Please create a user first.");
    }

    // Seed CSTEM and Robotics programs
    await ctx.db.insert("programs", {
      name: "CSTEM",
      slug: "cstem",
      description: "Computer Science, Technology, Engineering, and Mathematics program",
      createdBy: firstUser._id,
    });

    await ctx.db.insert("programs", {
      name: "Robotics",
      slug: "robotics",
      description: "Robotics and automation program",
      createdBy: firstUser._id,
    });

    return { message: "Initial programs seeded successfully" };
  },
});
