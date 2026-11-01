// Fills {name} placeholders in a dictionary string.
export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

/** Whole-peso prices, e.g. "₱150". */
export const pesoFormat = (lang: string) =>
  new Intl.NumberFormat(lang === "en" ? "en-PH" : "fil-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });
