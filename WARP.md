# Convex Guidelines

## Function Guidelines

### New Function Syntax
- ALWAYS use the new function syntax for Convex functions:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
export const f = query({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
    // Function body
    },
});
```

### HTTP Endpoint Syntax
- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
const http = httpRouter();
http.route({
    path: "/echo",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
    }),
});
```
- HTTP endpoints are always registered at the exact path you specify in the `path` field.

### Validators
- Array validator example:
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
args: {
    simpleArray: v.array(v.union(v.string(), v.number())),
},
handler: async (ctx, args) => {
    //...
},
});
```

- Discriminated union type schema:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    results: defineTable(
        v.union(
            v.object({
                kind: v.literal("error"),
                errorMessage: v.string(),
            }),
            v.object({
                kind: v.literal("success"),
                value: v.number(),
            }),
        ),
    )
});
```

- Always use `v.null()` validator when returning a null value.

### Valid Convex Types
| Convex Type | TS/JS type  | Validator                      |
|-------------|-------------|--------------------------------|
| Id          | string      | `v.id(tableName)`              |
| Null        | null        | `v.null()`                     |
| Int64       | bigint      | `v.int64()`                    |
| Float64     | number      | `v.number()`                   |
| Boolean     | boolean     | `v.boolean()`                  |
| String      | string      | `v.string()`                   |
| Bytes       | ArrayBuffer | `v.bytes()`                    |
| Array       | Array       | `v.array(values)`              |
| Object      | Object      | `v.object({property: value})`  |
| Record      | Record      | `v.record(keys, values)`       |

### Function Registration
- Use `internalQuery`, `internalMutation`, and `internalAction` for internal/private functions
- Use `query`, `mutation`, and `action` for public functions
- ALWAYS include argument and return validators for all Convex functions
- If a function doesn't return anything, include `returns: v.null()`

### Function Calling
- Use `ctx.runQuery` to call a query from a query, mutation, or action
- Use `ctx.runMutation` to call a mutation from a mutation or action
- Use `ctx.runAction` to call an action from an action
- All calls take a `FunctionReference` - do NOT pass the callee function directly

### Function References
- Use `api` object for public functions (e.g., `api.example.f`)
- Use `internal` object for internal functions (e.g., `internal.example.g`)
- Convex uses file-based routing

### Pagination
```ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const listWithExtraArg = query({
    args: { paginationOpts: paginationOptsValidator, author: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("author"), args.author))
        .order("desc")
        .paginate(args.paginationOpts);
    },
});
```

## Validator Guidelines
- `v.bigint()` is deprecated - use `v.int64()` instead
- Use `v.record()` for record types - `v.map()` and `v.set()` are NOT supported

## Schema Guidelines
- Always define schema in `convex/schema.ts`
- Import schema definition functions from `convex/server`
- System fields `_creationTime` and `_id` are automatically added
- Always include all index fields in the index name (e.g., "by_field1_and_field2")

## TypeScript Guidelines
- Use `Id` type from `./_generated/dataModel` for document IDs (e.g., `Id<'users'>`)
- Be strict with types, especially around document IDs
- Always use `as const` for string literals in discriminated unions
- Always add `@types/node` when using Node.js built-in modules

## Query Guidelines
- Do NOT use `filter` in queries - define an index and use `withIndex` instead
- Convex queries do NOT support `.delete()` - use `.collect()` and iterate with `ctx.db.delete()`
- Use `.unique()` to get a single document
- Default order is ascending `_creationTime`

## Mutation Guidelines
- Use `ctx.db.replace` to fully replace an existing document
- Use `ctx.db.patch` to shallow merge updates

## Action Guidelines
- Always add `"use node";` at the top of files using Node.js built-in modules
- Never use `ctx.db` inside actions - actions don't have database access

## Scheduling Guidelines

### Cron Jobs
- Only use `crons.interval` or `crons.cron` methods
- Do NOT use `crons.hourly`, `crons.daily`, or `crons.weekly` helpers
```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("job name", { hours: 2 }, internal.crons.myFunction, {});
export default crons;
```

## File Storage Guidelines
- Use `ctx.storage.getUrl()` for signed URLs (returns `null` if file doesn't exist)
- Do NOT use deprecated `ctx.storage.getMetadata` - query `_storage` system table instead
- Convex storage stores items as `Blob` objects
