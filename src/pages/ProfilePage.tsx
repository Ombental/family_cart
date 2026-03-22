import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, X, Check, Phone, User, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Profile page — displays the current user's phone number (read-only)
 * and display name (editable). Includes a logout button.
 */
export function ProfilePage() {
  const { user, updateName, logout } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const { permissionStatus, requestPermission } = useNotifications();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function startEditing() {
    if (!user) return;
    setNameInput(user.displayName);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setNameInput("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === user?.displayName) {
      cancelEditing();
      return;
    }

    setIsSaving(true);
    try {
      await updateName(trimmed);
      setIsEditing(false);
      setNameInput("");
      toast.success(t("profile.nameUpdated"));
    } catch {
      toast.error(t("profile.nameUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("auth.notLoggedIn")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pt-6">
        <h2 className="text-2xl font-bold tracking-tight">{t("profile.title")}</h2>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Phone number — read-only */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Phone className="h-3 w-3" />
              {t("profile.phoneNumber")}
            </label>
            <p className="text-sm" style={{ color: "var(--fc-text-primary)" }}>
              {user.phoneNumber}
            </p>
          </div>

          {/* Display name — editable */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <User className="h-3 w-3" />
              {t("profile.displayName")}
            </label>

            {isEditing ? (
              <form onSubmit={handleSave} className="flex items-center gap-2">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                  disabled={isSaving}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={isSaving || !nameInput.trim()}
                  aria-label={t("profile.saveName")}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  aria-label={t("profile.cancelEditing")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <p
                  className="text-sm"
                  style={{ color: "var(--fc-text-primary)" }}
                >
                  {user.displayName}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={startEditing}
                  aria-label={t("profile.editName")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language toggle */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("profile.language")}
          </label>
          <div className="flex gap-2">
            <Button
              variant={lang === "en" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setLang("en")}
            >
              English
            </Button>
            <Button
              variant={lang === "he" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setLang("he")}
            >
              עברית
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Bell className="h-3 w-3" />
            {t('notifications.settings')}
          </label>

          {permissionStatus === 'granted' && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm">{t('notifications.enabled')}</p>
            </div>
          )}

          {permissionStatus === 'default' && (
            <Button variant="outline" className="w-full" onClick={requestPermission}>
              {t('notifications.enable')}
            </Button>
          )}

          {permissionStatus === 'denied' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <p className="text-sm">{t('notifications.blocked')}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('notifications.blockedHelp')}
              </p>
            </div>
          )}

          {permissionStatus === 'unsupported' && (
            <p className="text-sm text-muted-foreground">{t('notifications.disabled')}</p>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        {t("profile.logOut")}
      </Button>
    </div>
  );
}
