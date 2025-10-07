"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const generateKitSheetPdf = action({
  args: { kitId: v.id("kits") },
  handler: async (ctx, args): Promise<{ html: string; kitName: string }> => {
    // Fetch kit data
    const kit: any = await ctx.runQuery(api.kits.get, { id: args.kitId });
    if (!kit) throw new Error("Kit not found");

    // Fetch image URL if kit has an image
    let imageUrl: string | null = null;
    if (kit.image) {
      try {
        imageUrl = await ctx.runQuery(api.storage.getImageUrl, { storageId: kit.image });
      } catch (e) {
        console.error("Failed to fetch kit image:", e);
      }
    }

    // Parse structured data if available
    let pouches: Array<{ name: string; materials: Array<{ name: string; quantity: number; unit: string; notes?: string }> }> = [];
    
    if (kit.isStructured && kit.packingRequirements) {
      try {
        pouches = JSON.parse(kit.packingRequirements);
      } catch (e) {
        throw new Error("Failed to parse kit structure");
      }
    }

    // Generate HTML content for PDF (we'll use a simple HTML structure)
    let htmlContent: string = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; font-size: 12px; }
          h1 { color: #333; border-bottom: 1px solid #666; padding-bottom: 5px; margin: 0 0 5px 0; font-size: 16px; }
          h2 { color: #666; margin: 10px 0 5px 0; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; font-size: 11px; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 10px; }
          .kit-info-container { display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start; }
          .kit-info { flex: 1; }
          .kit-info p { margin: 2px 0; line-height: 1.3; }
          .kit-image { flex-shrink: 0; }
          .kit-image img { max-width: 150px; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Science Utsav Management System</h1>
          <h2>Kit Sheet</h2>
        </div>
        <div class="kit-info-container">
          <div class="kit-info">
            <p><strong>Kit Name:</strong> ${kit.name}</p>
            <p><strong>Type:</strong> ${kit.type.toUpperCase()}</p>
            <p><strong>Stock Count:</strong> ${kit.stockCount}</p>
            ${kit.serialNumber ? `<p><strong>Serial Number:</strong> ${kit.serialNumber}</p>` : ''}
          </div>
          ${imageUrl ? `
          <div class="kit-image">
            <img src="${imageUrl}" alt="${kit.name}" />
          </div>
          ` : ''}
        </div>
    `;

    if (pouches.length > 0) {
      pouches.forEach((pouch) => {
        htmlContent += `
          <h2>Pouch: ${pouch.name}</h2>
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        pouch.materials.forEach((material) => {
          htmlContent += `
            <tr>
              <td>${material.name}</td>
              <td>${material.quantity}</td>
              <td>${material.unit || '-'}</td>
              <td>${material.notes || '-'}</td>
            </tr>
          `;
        });
        
        htmlContent += `
            </tbody>
          </table>
        `;
      });
    } else {
      htmlContent += `<p><em>No materials specified for this kit.</em></p>`;
    }

    htmlContent += `
      </body>
      </html>
    `;

    // Return HTML content (frontend will handle PDF generation using browser APIs)
    return { html: htmlContent, kitName: kit.name };
  },
});