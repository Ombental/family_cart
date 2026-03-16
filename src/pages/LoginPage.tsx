import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Login page.
 *
 * Renders outside the main AppShell layout (no header/BottomNav).
 * Users enter their phone number; on success they are redirected to "/".
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);

    try {
      await login(trimmed);
      navigate("/", { replace: true });
    } catch {
      setError(t("auth.noAccount"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <button
        type="button"
        onClick={() => setLang(lang === "en" ? "he" : "en")}
        className="absolute top-4 end-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {lang === "en" ? "עברית" : "English"}
      </button>
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: "var(--fc-primary)" }}
          >
            {t("common.appName")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("auth.signIn")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="tel"
              placeholder={t("auth.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md px-3 py-2 text-sm" style={{ color: "var(--fc-error)" }}>
              <p>
                {error}.{" "}
                <Link
                  to="/register"
                  className="font-medium underline underline-offset-4"
                  style={{ color: "var(--fc-primary)" }}
                >
                  {t("auth.registerInstead")}
                </Link>
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!phone.trim() || loading}
            style={{ backgroundColor: "var(--fc-primary)" }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("auth.loggingIn")}
              </>
            ) : (
              t("auth.logIn")
            )}
          </Button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.dontHaveAccount")}{" "}
          <Link
            to="/register"
            className="font-medium underline underline-offset-4"
            style={{ color: "var(--fc-primary)" }}
          >
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
