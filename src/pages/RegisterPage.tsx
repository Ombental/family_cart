import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Registration page.
 *
 * Standalone page (no AppShell / BottomNav) where new users create an account
 * by providing a phone number and display name.
 */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = phone.trim() !== "" && displayName.trim() !== "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      await register(phone.trim(), displayName.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.registrationFailed"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--fc-bg)] px-4">
      <button
        type="button"
        onClick={() => setLang(lang === "en" ? "he" : "en")}
        className="absolute top-4 end-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {lang === "en" ? "עברית" : "English"}
      </button>
      <div className="w-full max-w-sm space-y-8">
        {/* ---- Logo / Title ---- */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fc-primary)]">
            <ShoppingCart className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--fc-primary)]">
            {t("common.appName")}
          </h1>
          <p className="text-sm text-[var(--fc-text-secondary)]">
            {t("common.tagline")}
          </p>
        </div>

        {/* ---- Form ---- */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("auth.phoneNumber")}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t("auth.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName">{t("auth.displayName")}</Label>
            <Input
              id="displayName"
              type="text"
              placeholder={t("auth.displayNamePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              disabled={loading}
            />
          </div>

          {/* ---- Error message ---- */}
          {error && (
            <p className="text-sm text-[var(--fc-error)] text-center">
              {error}
            </p>
          )}

          {/* ---- Submit ---- */}
          <Button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full bg-[var(--fc-primary)] hover:bg-[var(--fc-primary)]/90 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("auth.creatingAccount")}
              </>
            ) : (
              t("auth.createAccount")
            )}
          </Button>
        </form>

        {/* ---- Log in link ---- */}
        <p className="text-center text-sm text-[var(--fc-text-secondary)]">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link
            to="/login"
            className="font-medium text-[var(--fc-primary)] hover:underline"
          >
            {t("auth.logInLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
