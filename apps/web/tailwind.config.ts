import type { Config } from "tailwindcss";

/** Alloy "liquid metal" tokens (docs/design/artdir/wow). Colours resolve to CSS vars in app/globals.css. */
const config = {
  darkMode: ["class"],
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  // Component classes built dynamically (tones t-*, variants c-btn--*, c-stamp--*, c-banner--*).
  safelist: [{ pattern: /^(t|c)-/ }],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["32px", { lineHeight: "1" }],
        body: ["15px", { lineHeight: "1.4" }],
        small: ["12px", { lineHeight: "1.3" }],
      },
      colors: {
        // Alloy liquid-metal palette
        ink: "var(--ink)",
        mute: "var(--mute)",
        dim: "var(--dim)",
        line: "var(--line)",
        line2: "var(--line2)",
        fill: "var(--fill)",
        fill2: "var(--fill2)",
        copper: { DEFAULT: "var(--copper)", ink: "var(--copper-ink)" },
        // Legacy token names (mapped onto the palette above)
        bg: "var(--bg)",
        s1: "var(--s1)",
        s2: "var(--s2)",
        sheet: "var(--sheet)",
        bd: "var(--bd)",
        bdi: "var(--bdi)",
        tx: "var(--tx)",
        tx2: "var(--tx2)",
        tx3: "var(--tx3)",
        acc: "var(--acc)",
        brand: "var(--brand)",
        tint: "var(--tint)",
        gold: "var(--gold)",
        gain: "var(--gain)",
        loss: "var(--loss)",
        warn: "var(--warn)",
        // shadcn bridge (components/ui/*)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      spacing: { gutter: "16px" },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      maxWidth: { app: "1200px" },
      transitionTimingFunction: { alloy: "cubic-bezier(.16,1,.3,1)" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "sheet-in": "c-sheet-in 240ms ease-out",
        "fade-in": "c-fade-in 150ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
