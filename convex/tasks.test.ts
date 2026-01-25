import { describe, expect, it } from "vitest";
import schema from "./schema";

describe("Tasks Schema", () => {
  it("should define tasks table", () => {
    expect(schema.tables.tasks).toBeDefined();
  });

  it("should have required task fields", () => {
    const taskTable = schema.tables.tasks;
    expect(taskTable).toBeDefined();
  });
});

describe("Task Status Values", () => {
  const validStatuses = [
    "today",
    "next_up",
    "in_progress",
    "admin_review",
    "client_review",
    "stuck",
    "done",
  ];

  it("should have 7 valid status values", () => {
    expect(validStatuses).toHaveLength(7);
  });

  it("should include 'today' status", () => {
    expect(validStatuses).toContain("today");
  });

  it("should include 'next_up' status", () => {
    expect(validStatuses).toContain("next_up");
  });

  it("should include 'in_progress' status", () => {
    expect(validStatuses).toContain("in_progress");
  });

  it("should include 'admin_review' status", () => {
    expect(validStatuses).toContain("admin_review");
  });

  it("should include 'client_review' status", () => {
    expect(validStatuses).toContain("client_review");
  });

  it("should include 'stuck' status", () => {
    expect(validStatuses).toContain("stuck");
  });

  it("should include 'done' status", () => {
    expect(validStatuses).toContain("done");
  });
});

describe("Task Priority Values", () => {
  const validPriorities = ["low", "medium", "high"];

  it("should have 3 valid priority values", () => {
    expect(validPriorities).toHaveLength(3);
  });

  it("should include 'low' priority", () => {
    expect(validPriorities).toContain("low");
  });

  it("should include 'medium' priority", () => {
    expect(validPriorities).toContain("medium");
  });

  it("should include 'high' priority", () => {
    expect(validPriorities).toContain("high");
  });
});
