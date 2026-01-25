import { QueryCtx } from "../_generated/server";
import { Doc, Id, TableNames } from "../_generated/dataModel";

/**
 * Batch fetch documents by IDs and return as a Map for O(1) lookups.
 *
 * @param ctx - Convex query context
 * @param table - Table name (used for type inference only)
 * @param ids - Array of document IDs to fetch
 * @returns Map of ID to document, excluding null results
 *
 * @example
 * ```ts
 * const tasksMap = await batchGet(ctx, "tasks", taskIds);
 * const task = tasksMap.get(taskId); // O(1) lookup
 * ```
 */
export async function batchGet<T extends TableNames>(
  ctx: QueryCtx,
  _table: T, // Used for type inference
  ids: Id<T>[]
): Promise<Map<Id<T>, Doc<T>>> {
  if (ids.length === 0) {
    return new Map();
  }

  // Deduplicate IDs for efficiency
  const uniqueIds = [...new Set(ids)];

  // Fetch all documents in parallel
  const docs = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));

  // Build map, filtering out nulls
  const map = new Map<Id<T>, Doc<T>>();
  for (let i = 0; i < uniqueIds.length; i++) {
    const doc = docs[i];
    if (doc !== null) {
      map.set(uniqueIds[i], doc as Doc<T>);
    }
  }
  return map;
}

/**
 * Batch fetch documents by IDs and return as an array.
 * Preserves order of input IDs, filtering out documents that don't exist.
 *
 * @param ctx - Convex query context
 * @param ids - Array of document IDs to fetch
 * @returns Array of documents in the same order as input IDs (nulls filtered)
 *
 * @example
 * ```ts
 * const tasks = await batchGetArray(ctx, taskIds);
 * // tasks array is in same order as taskIds, missing IDs are omitted
 * ```
 */
export async function batchGetArray<T extends TableNames>(
  ctx: QueryCtx,
  ids: Id<T>[]
): Promise<Doc<T>[]> {
  if (ids.length === 0) {
    return [];
  }

  const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const result: Doc<T>[] = [];
  for (const doc of docs) {
    if (doc !== null) {
      result.push(doc as Doc<T>);
    }
  }
  return result;
}

/**
 * Batch fetch documents with their IDs preserved.
 * Useful when you need to correlate results with their IDs.
 *
 * @param ctx - Convex query context
 * @param ids - Array of document IDs to fetch
 * @returns Array of {id, doc} pairs, where doc may be null
 */
export async function batchGetWithIds<T extends TableNames>(
  ctx: QueryCtx,
  ids: Id<T>[]
): Promise<Array<{ id: Id<T>; doc: Doc<T> | null }>> {
  if (ids.length === 0) {
    return [];
  }

  const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
  return ids.map((id, i) => ({
    id,
    doc: docs[i] as Doc<T> | null,
  }));
}
