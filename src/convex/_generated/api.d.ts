/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as assignments from "../assignments.js";
import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as inventoryCategories from "../inventoryCategories.js";
import type * as kitPdf from "../kitPdf.js";
import type * as kits from "../kits.js";
import type * as programs from "../programs.js";
import type * as reports from "../reports.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as seed_action from "../seed_action.js";
import type * as seed_programs from "../seed_programs.js";
import type * as services from "../services.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  assignments: typeof assignments;
  auth: typeof auth;
  clients: typeof clients;
  email: typeof email;
  http: typeof http;
  inventory: typeof inventory;
  inventoryCategories: typeof inventoryCategories;
  kitPdf: typeof kitPdf;
  kits: typeof kits;
  programs: typeof programs;
  reports: typeof reports;
  roles: typeof roles;
  seed: typeof seed;
  seed_action: typeof seed_action;
  seed_programs: typeof seed_programs;
  services: typeof services;
  storage: typeof storage;
  users: typeof users;
  vendors: typeof vendors;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
