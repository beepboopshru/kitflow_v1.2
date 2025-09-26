"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

type SeedResult = { message: string } | { message: string; kits: any[]; clients: any[] }; // Explicit result type to satisfy TS

export const run = action({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    const res: SeedResult | undefined = await ctx.runMutation(internal.seed.seedData, {});
    return res ?? { message: "Seed ran" };
  },
});