import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface CreateGroupFormProps {
  onCreateGroup: (groupName: string) => Promise<void>;
  loading: boolean;
}

/**
 * Form to create a new family group.
 */
export function CreateGroupForm({ onCreateGroup, loading }: CreateGroupFormProps) {
  const [name, setName] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      await onCreateGroup(name.trim());
    },
    [name, onCreateGroup]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Family Group</CardTitle>
        <CardDescription>
          Start a new shared grocery list. You can invite other households after
          creating the group.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. The Bental-Smith Family"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="off"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loading || !name.trim()}
          >
            <Plus className="h-4 w-4" />
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
