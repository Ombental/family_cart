import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";

interface JoinFormProps {
  onJoin: (inviteCode: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

/**
 * Form for entering an invite code to join a group.
 */
export function JoinForm({ onJoin, error, loading }: JoinFormProps) {
  const [code, setCode] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!code.trim()) return;
      await onJoin(code.trim());
    },
    [code, onJoin]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a Family Group</CardTitle>
        <CardDescription>
          Enter the invite code you received from a family member.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="e.g. ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-lg font-mono tracking-[0.2em] uppercase"
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loading || !code.trim()}
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Joining..." : "Join Group"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
