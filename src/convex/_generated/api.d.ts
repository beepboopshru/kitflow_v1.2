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
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as kitPdf from "../kitPdf.js";
import type * as kits from "../kits.js";
import type * as programs from "../programs.js";
import type * as reports from "../reports.js";
import type * as seed from "../seed.js";
import type * as seed_action from "../seed_action.js";
import type * as seed_programs from "../seed_programs.js";
import type * as users from "../users.js";

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
  "auth/emailOtp": typeof auth_emailOtp;
  auth: typeof auth;
  clients: typeof clients;
  http: typeof http;
  inventory: typeof inventory;
  kitPdf: typeof kitPdf;
  kits: typeof kits;
  programs: typeof programs;
  reports: typeof reports;
  seed: typeof seed;
  seed_action: typeof seed_action;
  seed_programs: typeof seed_programs;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
