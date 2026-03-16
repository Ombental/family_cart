import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageContext";

/**
 * Custom render that wraps components in LanguageProvider.
 * Use this instead of RTL's render for components that use useLanguage().
 */
function renderWithLanguage(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <LanguageProvider>{children}</LanguageProvider>
    ),
    ...options,
  });
}

export { renderWithLanguage };
