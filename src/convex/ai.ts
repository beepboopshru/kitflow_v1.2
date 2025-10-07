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
    const [summary, kits] = (await Promise.all([
      ctx.runQuery(api.reports.getInventorySummary, {}),
      ctx.runQuery(api.kits.list, {}),
    ])) as [any, any[]];

    const kitsBrief = (kits ?? []).slice(0, 50).map((k: any) => ({
      name: k.name,
      type: k.type,
      stock: k.stockCount,
      status: k.status,
    }));

    const systemPrompt: string =
      `You are KitFlow Assistant for a minimalist inventory system.\n` +
      `Answer concisely and helpfully. Use the provided database context to inform your answers.\n\n` +
      `Database Summary:\n${JSON.stringify(summary, null, 2)}\n\n` +
      `Kits (first 50):\n${JSON.stringify(kitsBrief, null, 2)}\n\n` +
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