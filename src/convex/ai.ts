"use node";

/* Removed OpenAI SDK import; using fetch to call OpenRouter */
import { action } from "./_generated/server";
import { v } from "convex/values";
/* Using dynamic import for api inside handler to avoid circular types */

export const chat = action({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    // Fetch live DB context (reuse existing queries)
    // Using dynamic import with loose typing to avoid heavy generated types
    // @ts-ignore - suppress deep type instantiation from generated API types
    const mod: any = await import("./_generated/api");
    const api = mod.api as any;
    const [summary, kits, clients, assignments, vendors, services, inventory, laserFiles] = (await Promise.all([
      ctx.runQuery(api.reports.getInventorySummary, {}),
      ctx.runQuery(api.kits.list, {}),
      ctx.runQuery(api.clients.list, {}),
      ctx.runQuery(api.assignments.list, {}),
      ctx.runQuery(api.vendors.list, {}),
      ctx.runQuery(api.services.list, {}),
      ctx.runQuery(api.inventory.listByCategory, { category: "raw_material" }),
      ctx.runQuery(api.laserFiles.list, {}),
    ])) as [any, any[], any[], any[], any[], any[], any[], any[]];

    const kitsBrief = (kits ?? []).slice(0, 50).map((k: any) => ({
      name: k.name,
      type: k.type,
      stock: k.stockCount,
      status: k.status,
      remarks: k.remarks,
      serialNumber: k.serialNumber,
    }));

    const clientsBrief = (clients ?? []).slice(0, 30).map((c: any) => ({
      name: c.name,
      organization: c.organization,
      type: c.type,
      notes: c.notes,
    }));

    const assignmentsBrief = (assignments ?? []).slice(0, 30).map((a: any) => ({
      kitName: a.kit?.name,
      clientName: a.client?.name,
      quantity: a.quantity,
      status: a.status,
      notes: a.notes,
    }));

    const vendorsBrief = (vendors ?? []).slice(0, 30).map((v: any) => ({
      name: v.name,
      organization: v.organization,
      materialType: v.materialType,
      notes: v.notes,
    }));

    const servicesBrief = (services ?? []).slice(0, 30).map((s: any) => ({
      name: s.name,
      serviceType: s.serviceType,
      contact: s.contact,
      notes: s.notes,
    }));

    const inventoryBrief = (inventory ?? []).slice(0, 30).map((i: any) => ({
      name: i.name,
      category: i.category,
      subCategory: i.subCategory,
      quantity: i.quantity,
      notes: i.notes,
    }));

    const laserFilesBrief = (laserFiles ?? []).slice(0, 50).map((lf: any) => ({
      fileName: lf.fileName,
      kitId: lf.kitId,
      uploadedAt: lf.uploadedAt,
    }));

    const systemPrompt: string =
      `You are ScienceUtsav AI Manager for a minimalist inventory system.\n` +
      `Answer concisely and helpfully. Use the provided database context to inform your answers.\n\n` +
      `Database Summary:\n${JSON.stringify(summary, null, 2)}\n\n` +
      `Kits (first 50, includes remarks and serial numbers):\n${JSON.stringify(kitsBrief, null, 2)}\n\n` +
      `Clients (first 30, includes notes):\n${JSON.stringify(clientsBrief, null, 2)}\n\n` +
      `Assignments (first 30, includes notes):\n${JSON.stringify(assignmentsBrief, null, 2)}\n\n` +
      `Vendors (first 30, includes notes and material types):\n${JSON.stringify(vendorsBrief, null, 2)}\n\n` +
      `Services (first 30, includes service types and notes):\n${JSON.stringify(servicesBrief, null, 2)}\n\n` +
      `Inventory Items (first 30, includes notes):\n${JSON.stringify(inventoryBrief, null, 2)}\n\n` +
      `Laser Files (first 50):\n${JSON.stringify(laserFilesBrief, null, 2)}\n\n` +
      `If asked for unavailable details, say you don't have that info yet.`;

    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.error("Missing OPENROUTER_API_KEY");
        return { content: "AI is not configured yet. Please add your OpenRouter API key." };
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://kitflow.app",
          "X-Title": "KitFlow",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.message },
          ],
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter error:", response.status, errText);
        return { content: "Sorry, there was an error generating a response. Please try again." };
      }

      const data: any = await response.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "No response.";
      return { content };
    } catch (error: any) {
      console.error("AI chat error:", error?.message || error);
      return { content: "Sorry, there was an error generating a response. Please try again." };
    }
  },
});