import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows only safe HTML tags and attributes used by TipTap.
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    // Server-side: return empty string (will be hydrated on client)
    return "";
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "span",
      "a",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "data-type", "data-id"],
    ALLOW_DATA_ATTR: true,
  });
}
