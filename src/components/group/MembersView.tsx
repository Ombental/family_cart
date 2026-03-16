import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Household } from "@/types/group";

interface MembersViewProps {
  groupId: string;
  groupName: string;
  households: Household[];
}

/**
 * Group members view — lists all households with their names and colors.
 */
export function MembersView({ groupId, groupName, households }: MembersViewProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/group/${groupId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Members</h2>
          <p className="text-sm text-muted-foreground">{groupName}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Households ({households.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {households.map((household) => (
            <div
              key={household.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div
                className="h-8 w-8 rounded-full shrink-0"
                style={{ backgroundColor: household.color }}
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{household.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {household.id}
                </p>
              </div>
            </div>
          ))}

          {households.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No households have joined yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
