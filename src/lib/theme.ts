export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "kape-theme";

// Map layers cannot read CSS variables, so the map colors live here.
// Keep in sync with the tokens in globals.css.
export const PIN_COLORS = {
  dark: {
    specialty: "#e8742c", // ember
    matcha: "#b5d98f", // leaf
    other: "#cdbba8",
    chain: "#6b5d52",
    outline: "#1a1411", // roast
    me: "#6aa8ff",
  },
  light: {
    specialty: "#c4541a",
    matcha: "#4f7a2a",
    other: "#7d6a58",
    chain: "#a89888",
    outline: "#f6efe6", // roast
    me: "#1f6fd1",
  },
} as const satisfies Record<Theme, Record<string, string>>;
