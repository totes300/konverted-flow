import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE,
  MAX_COMMENT_LENGTH,
  ALLOWED_IMAGE_TYPES,
  isAllowedImageType,
  getFileSizeLimitText,
} from "./constants";

describe("MAX_FILE_SIZE", () => {
  it("should be 5MB in bytes", () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    expect(MAX_FILE_SIZE).toBe(5242880);
  });
});

describe("MAX_COMMENT_LENGTH", () => {
  it("should be 10000 characters", () => {
    expect(MAX_COMMENT_LENGTH).toBe(10000);
  });
});

describe("ALLOWED_IMAGE_TYPES", () => {
  it("should include JPEG", () => {
    expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
  });

  it("should include PNG", () => {
    expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
  });

  it("should include GIF", () => {
    expect(ALLOWED_IMAGE_TYPES).toContain("image/gif");
  });

  it("should include WebP", () => {
    expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
  });

  it("should only have 4 allowed types", () => {
    expect(ALLOWED_IMAGE_TYPES).toHaveLength(4);
  });

  it("should not include SVG (security risk)", () => {
    expect(ALLOWED_IMAGE_TYPES).not.toContain("image/svg+xml");
  });

  it("should not include BMP", () => {
    expect(ALLOWED_IMAGE_TYPES).not.toContain("image/bmp");
  });

  it("should not include TIFF", () => {
    expect(ALLOWED_IMAGE_TYPES).not.toContain("image/tiff");
  });
});

describe("isAllowedImageType", () => {
  describe("allowed types", () => {
    it("should return true for image/jpeg", () => {
      expect(isAllowedImageType("image/jpeg")).toBe(true);
    });

    it("should return true for image/png", () => {
      expect(isAllowedImageType("image/png")).toBe(true);
    });

    it("should return true for image/gif", () => {
      expect(isAllowedImageType("image/gif")).toBe(true);
    });

    it("should return true for image/webp", () => {
      expect(isAllowedImageType("image/webp")).toBe(true);
    });
  });

  describe("disallowed types", () => {
    it("should return false for image/svg+xml", () => {
      expect(isAllowedImageType("image/svg+xml")).toBe(false);
    });

    it("should return false for image/bmp", () => {
      expect(isAllowedImageType("image/bmp")).toBe(false);
    });

    it("should return false for text/html", () => {
      expect(isAllowedImageType("text/html")).toBe(false);
    });

    it("should return false for application/pdf", () => {
      expect(isAllowedImageType("application/pdf")).toBe(false);
    });

    it("should return false for application/javascript", () => {
      expect(isAllowedImageType("application/javascript")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isAllowedImageType("")).toBe(false);
    });

    it("should return false for undefined-like strings", () => {
      expect(isAllowedImageType("undefined")).toBe(false);
    });
  });

  describe("case sensitivity", () => {
    it("should return false for uppercase types", () => {
      expect(isAllowedImageType("IMAGE/JPEG")).toBe(false);
    });

    it("should return false for mixed case types", () => {
      expect(isAllowedImageType("Image/Jpeg")).toBe(false);
    });
  });

  describe("partial matches", () => {
    it("should return false for partial matches", () => {
      expect(isAllowedImageType("image/jp")).toBe(false);
    });

    it("should return false for types with extra text", () => {
      expect(isAllowedImageType("image/jpeg; charset=utf-8")).toBe(false);
    });
  });
});

describe("getFileSizeLimitText", () => {
  it("should return '5MB'", () => {
    expect(getFileSizeLimitText()).toBe("5MB");
  });

  it("should be a human-readable string", () => {
    const result = getFileSizeLimitText();
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d+MB$/);
  });
});
