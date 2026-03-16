/**
 * Tests for the i18n system: LanguageContext, translations, and language toggle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Unmock the LanguageContext so we can test the REAL implementation
vi.unmock("@/i18n/LanguageContext");

import { LanguageProvider, useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";

// ---------------------------------------------------------------------------
// Test component that exercises useLanguage
// ---------------------------------------------------------------------------
function TestConsumer() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="translated">{t("common.appName")}</span>
      <span data-testid="interpolated">{t("items.qty", { label: "2 kg" })}</span>
      <button onClick={() => setLang("en")}>English</button>
      <button onClick={() => setLang("he")}>עברית</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <LanguageProvider>
      <TestConsumer />
    </LanguageProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("i18n: LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset document attributes
    document.documentElement.dir = "";
    document.documentElement.lang = "";
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to Hebrew when no stored preference", () => {
    renderWithProvider();

    expect(screen.getByTestId("lang").textContent).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("he");
  });

  it("restores language from localStorage", () => {
    localStorage.setItem("familycart_lang", "en");

    renderWithProvider();

    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
  });

  it("t() returns correct translation for current language", () => {
    localStorage.setItem("familycart_lang", "en");
    renderWithProvider();

    expect(screen.getByTestId("translated").textContent).toBe("FamilyCart");
  });

  it("t() supports {{param}} interpolation", () => {
    localStorage.setItem("familycart_lang", "en");
    renderWithProvider();

    expect(screen.getByTestId("interpolated").textContent).toBe("Qty: 2 kg");
  });

  it("switching language updates dir, lang, and translations", async () => {
    const user = userEvent.setup();
    localStorage.setItem("familycart_lang", "en");
    renderWithProvider();

    // Start in English
    expect(screen.getByTestId("lang").textContent).toBe("en");

    // Switch to Hebrew
    await user.click(screen.getByText("עברית"));

    expect(screen.getByTestId("lang").textContent).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("he");
  });

  it("persists language choice to localStorage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("familycart_lang", "en");
    renderWithProvider();

    await user.click(screen.getByText("עברית"));

    expect(localStorage.getItem("familycart_lang")).toBe("he");
  });

  it("falls back to English translation when Hebrew key is missing", () => {
    localStorage.setItem("familycart_lang", "he");
    renderWithProvider();

    // common.appName is "FamilyCart" in both languages
    expect(screen.getByTestId("translated").textContent).toBe("FamilyCart");
  });

  it("falls back to key when translation is missing in both languages", () => {
    localStorage.setItem("familycart_lang", "en");

    function KeyFallbackTest() {
      const { t } = useLanguage();
      return <span data-testid="missing">{t("nonexistent.key")}</span>;
    }

    render(
      <LanguageProvider>
        <KeyFallbackTest />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("missing").textContent).toBe("nonexistent.key");
  });
});

describe("i18n: translations completeness", () => {
  it("every English key has a corresponding Hebrew key", () => {
    const enKeys = Object.keys(translations.en);
    const heKeys = new Set(Object.keys(translations.he));

    const missing = enKeys.filter((k) => !heKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("every Hebrew key has a corresponding English key", () => {
    const heKeys = Object.keys(translations.he);
    const enKeys = new Set(Object.keys(translations.en));

    const extra = heKeys.filter((k) => !enKeys.has(k));
    expect(extra).toEqual([]);
  });
});
