import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  RESEARCH_DEVELOPMENT: "research_development",
  OPERATIONS: "operations",
  INVENTORY: "inventory",
  CONTENT: "content",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MANAGER),
  v.literal(ROLES.RESEARCH_DEVELOPMENT),
  v.literal(ROLES.OPERATIONS),
  v.literal(ROLES.INVENTORY),
  v.literal(ROLES.CONTENT),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      isApproved: v.optional(v.boolean()), // whether the user has been approved by an admin
      approvedBy: v.optional(v.id("users")), // admin who approved the user
      approvedAt: v.optional(v.number()), // timestamp of approval
    }).index("email", ["email"])
      .index("by_approval_status", ["isApproved"]), // index for the email. do not remove or modify

    // Program Management
    programs: defineTable({
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      categories: v.optional(v.array(v.string())),
      createdBy: v.id("users"),
    }).index("by_slug", ["slug"]),

    // Kit Management
    kits: defineTable({
      name: v.string(),
      type: v.string(),
      category: v.optional(v.string()),
      cstemVariant: v.optional(v.union(v.literal("explorer"), v.literal("discoverer"))),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      stockCount: v.number(),
      lowStockThreshold: v.number(),
      packingRequirements: v.optional(v.string()),
      isStructured: v.optional(v.boolean()),
      status: v.union(v.literal("in_stock"), v.literal("assigned"), v.literal("to_be_made")),
      remarks: v.optional(v.string()),
      serialNumber: v.optional(v.string()),
      createdBy: v.id("users"),
    }).index("by_type", ["type"]).index("by_status", ["status"]),

    // Client Database
    clients: defineTable({
      name: v.string(),
      organization: v.string(),
      contact: v.string(),
      type: v.union(v.literal("monthly"), v.literal("one_time")),
      email: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.id("users"),
    }).index("by_type", ["type"]),

    // Kit Assignments (Packing/Pouching Plans)
    assignments: defineTable({
      kitId: v.id("kits"),
      clientId: v.id("clients"),
      quantity: v.number(),
      status: v.union(v.literal("assigned"), v.literal("packed"), v.literal("dispatched")),
      notes: v.optional(v.string()),
      assignedBy: v.id("users"),
      assignedAt: v.number(),
      updatedAt: v.optional(v.number()),
      grade: v.optional(v.number()),
      dispatchedAt: v.optional(v.number()),
    }).index("by_kit", ["kitId"]).index("by_client", ["clientId"]).index("by_status", ["status"]),

    // Inventory Management
    inventory: defineTable({
      name: v.string(),
      category: v.union(
        v.literal("raw_material"),
        v.literal("pre_processed"),
        v.literal("finished_good"),
      ),
      subCategory: v.optional(v.string()),
      unit: v.optional(v.string()),
      quantity: v.number(),
      notes: v.optional(v.string()),
      createdBy: v.id("users"),
    }).index("by_category", ["category"])
      .index("by_category_and_subCategory", ["category", "subCategory"]),

    // Add: Inventory Categories (custom subcategories for raw & pre-processed)
    inventoryCategories: defineTable({
      name: v.string(),
      value: v.string(),
      categoryType: v.union(v.literal("raw_material"), v.literal("pre_processed")),
      createdBy: v.id("users"),
    })
      .index("by_categoryType", ["categoryType"])
      .index("by_value", ["value"]),

    // Vendor Contacts
  vendors: defineTable({
    name: v.string(),
    organization: v.string(),
    contact: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    materialType: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_name", ["name"])
    .index("by_materialType", ["materialType"]),

    // Service Provider Contacts
    services: defineTable({
      name: v.string(),
      serviceType: v.string(),
      contact: v.string(),
      email: v.optional(v.string()),
      address: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.id("users"),
    }).index("by_serviceType", ["serviceType"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;