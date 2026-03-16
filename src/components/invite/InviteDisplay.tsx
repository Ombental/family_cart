import { useState, useCallback } from "react";
import { Copy, Share2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";

interface InviteDisplayProps {
  inviteCode: string;
  groupName: string;
  onRegenerate?: () => Promise<void>;
  showRegenerate?: boolean;
}

/**
 * Displays an invite code with copy-to-clipboard and native share actions.
 * Used in both the holding state screen and the invite generation UI.
 */
export function InviteDisplay({
  inviteCode,
  groupName,
  onRegenerate,
  showRegenerate = false,
}: InviteDisplayProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const shareText = t("invite.shareText", { groupName, code: inviteCode });

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteCode]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("invite.shareTitle"),
          text: shareText,
        });
      } catch {
        // User cancelled or share failed — silently ignore
      }
    }
  }, [shareText, t]);

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  }, [onRegenerate]);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">{t("invite.code")}</p>
          <p className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
            {inviteCode}
          </p>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? t("invite.copied") : t("invite.copyCode")}
          </Button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              {t("invite.share")}
            </Button>
          )}

          {showRegenerate && onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
              />
              {t("invite.newCode")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
