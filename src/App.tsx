import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { HomePage } from "@/pages/HomePage";
import { CreateGroupPage } from "@/pages/CreateGroupPage";
import { JoinGroupPage } from "@/pages/JoinGroupPage";
import { GroupPage } from "@/pages/GroupPage";
import { GroupMembersPage } from "@/pages/GroupMembersPage";
import { ShopperModePage } from "@/pages/ShopperModePage";
import { TripHistoryPage } from "@/pages/TripHistoryPage";
import { TripSummaryPage } from "@/pages/TripSummaryPage";

/** Default layout: green header + bottom nav */
function MainLayout() {
  return (
    <AppShell variant="default">
      <Outlet />
    </AppShell>
  );
}

/** Shopper layout: no header/nav (ShopperModePage renders its own blue header) */
function ShopperLayout() {
  return (
    <AppShell variant="shopper">
      <Outlet />
    </AppShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main layout: green header + bottom nav */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateGroupPage />} />
          <Route path="/join" element={<JoinGroupPage />} />
          <Route path="/group/:groupId" element={<GroupPage />} />
          <Route path="/group/:groupId/members" element={<GroupMembersPage />} />
          <Route path="/group/:groupId/trips" element={<TripHistoryPage />} />
          <Route path="/group/:groupId/trip/:tripId" element={<TripSummaryPage />} />
        </Route>

        {/* Shopper layout: no header/nav */}
        <Route element={<ShopperLayout />}>
          <Route path="/group/:groupId/shopper" element={<ShopperModePage />} />
        </Route>
      </Routes>
      <Toaster position="bottom-center" />
    </BrowserRouter>
  );
}

export default App;
