import { useLocation, useNavigate, useParams } from "react-router-dom";
import { House, ListChecks, User } from "lucide-react";

interface NavTab {
  label: string;
  icon: typeof House;
  path: string | null;
  match: (pathname: string) => boolean;
}

/**
 * Bottom navigation bar for the default app layout.
 * Fixed to the bottom of the viewport with 3 tabs: Home, List, Profile.
 */
export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();

  // Resolve the group ID from either the URL or localStorage
  const resolvedGroupId =
    groupId ?? localStorage.getItem("familycart_lastGroupId");

  const tabs: NavTab[] = [
    {
      label: "Home",
      icon: House,
      path: "/",
      match: (p) => p === "/",
    },
    {
      label: "List",
      icon: ListChecks,
      path: resolvedGroupId ? `/group/${resolvedGroupId}` : null,
      match: (p) => p.startsWith("/group/") && !p.includes("/shopper"),
    },
    {
      label: "Profile",
      icon: User,
      path: "/profile",
      match: (p: string) => p === "/profile",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t"
      style={{
        backgroundColor: "var(--fc-surface)",
        borderColor: "var(--fc-border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.match(location.pathname);
        const isDisabled = tab.path === null;
        const Icon = tab.icon;

        return (
          <button
            key={tab.label}
            onClick={() => {
              if (!isDisabled && tab.path) {
                navigate(tab.path);
              }
            }}
            disabled={isDisabled}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors disabled:opacity-40"
            style={{
              color: isActive
                ? "var(--fc-primary)"
                : "var(--fc-text-tertiary)",
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
