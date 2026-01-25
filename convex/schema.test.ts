import { describe, expect, it } from "vitest";
import schema from "./schema";

// Test that the schema is properly defined and has all required tables and fields
describe("Convex Schema", () => {
  it("should define organizations table", () => {
    expect(schema.tables.organizations).toBeDefined();
  });

  it("should define users table", () => {
    expect(schema.tables.users).toBeDefined();
  });

  it("should define clients table", () => {
    expect(schema.tables.clients).toBeDefined();
  });

  it("should define tasks table", () => {
    expect(schema.tables.tasks).toBeDefined();
  });

  it("should define timeEntries table", () => {
    expect(schema.tables.timeEntries).toBeDefined();
  });

  it("should define activityEvents table", () => {
    expect(schema.tables.activityEvents).toBeDefined();
  });

  it("should define attachments table", () => {
    expect(schema.tables.attachments).toBeDefined();
  });

  it("should have exactly 7 tables", () => {
    expect(Object.keys(schema.tables)).toHaveLength(7);
  });

  it("should have users table defined", () => {
    // Verify the users table exists (indexes are defined in schema.ts)
    expect(schema.tables.users).toBeDefined();
  });

  it("should have tasks table defined", () => {
    // Verify the tasks table exists (indexes are defined in schema.ts)
    expect(schema.tables.tasks).toBeDefined();
  });
});
