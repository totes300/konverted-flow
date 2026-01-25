/**
 * F3.6: Date validation utilities
 */

/**
 * Validates a date string in YYYY-MM-DD format.
 * Checks format, valid month (1-12), valid day for the month,
 * and handles leap years correctly.
 */
export function isValidDate(dateString: string): boolean {
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  // Parse components
  const [year, month, day] = dateString.split("-").map(Number);

  // Month must be 1-12
  if (month < 1 || month > 12) {
    return false;
  }

  // Day must be at least 1
  if (day < 1) {
    return false;
  }

  // Get the number of days in the month
  // Using day 0 of next month gives last day of current month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Day must be valid for the month
  if (day > daysInMonth) {
    return false;
  }

  // Final verification: ensure the date parses correctly
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/**
 * Validates an email address format.
 * Basic validation - checks for @ and domain.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}
