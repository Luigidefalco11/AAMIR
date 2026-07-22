export type Locale = "it" | "en";

export function localize<T>(
  field: { it?: T; en?: T } | undefined,
  locale: Locale,
): T | "" {
  if (!field) return "";
  return field[locale] ?? field.it ?? "";
}
