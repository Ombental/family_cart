import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { translations } from "@/i18n/translations";

// ---------------------------------------------------------------------------
// Global mock for LanguageContext — all tests run in English by default.
// Tests that need to verify i18n behavior should override this mock locally.
// ---------------------------------------------------------------------------
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    lang: "en" as const,
    setLang: vi.fn(),
    t: (key: string, params?: Record<string, string | number>) => {
      let value = (translations as Record<string, Record<string, string>>).en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        }
      }
      return value;
    },
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));
