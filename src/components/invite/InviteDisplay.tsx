import { useState, useCallback } from "react";
import { Copy, Share2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const shareText = `Join my family group "${groupName}" on FamilyCart! Use invite code: ${inviteCode}`;

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
          title: "Join my FamilyCart group",
          text: shareText,
        });
      } catch {
        // User cancelled or share failed — silently ignore
      }
    }
  }, [shareText]);

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
          <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
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
            {copied ? "Copied!" : "Copy code"}
          </Button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
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
              New code
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
