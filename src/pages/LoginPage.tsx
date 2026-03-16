import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

/**
 * Login page.
 *
 * Renders outside the main AppShell layout (no header/BottomNav).
 * Users enter their phone number; on success they are redirected to "/".
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

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
      setError("No account found for this phone number");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: "var(--fc-primary)" }}
          >
            FamilyCart
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="tel"
              placeholder="Phone number"
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
                  Register instead
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
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </Button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-medium underline underline-offset-4"
            style={{ color: "var(--fc-primary)" }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
