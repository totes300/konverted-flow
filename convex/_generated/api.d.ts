/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as clients from "../clients.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_timezone from "../lib/timezone.js";
import type * as lib_validation from "../lib/validation.js";
import type * as organizations from "../organizations.js";
import type * as tasks from "../tasks.js";
import type * as timeEntries from "../timeEntries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  clients: typeof clients;
  "lib/auth": typeof lib_auth;
  "lib/timezone": typeof lib_timezone;
  "lib/validation": typeof lib_validation;
  organizations: typeof organizations;
  tasks: typeof tasks;
  timeEntries: typeof timeEntries;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
