import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import Kits from "@/pages/Kits.tsx";
import Clients from "@/pages/Clients.tsx";
import Assignments from "@/pages/Assignments.tsx";
import Inventory from "@/pages/Inventory.tsx";
import AdminZone from "./pages/AdminZone.tsx";
import Vendors from "@/pages/VendorContacts.tsx";
import Services from "@/pages/Services.tsx";
import UserManagement from "@/pages/UserManagement.tsx";
import PendingApproval from "@/pages/PendingApproval.tsx";
import "./types/global.d.ts";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/kits",
    element: <Kits />,
  },
  {
    path: "/clients",
    element: <Clients />,
  },
  {
    path: "/assignments",
    element: <Assignments />,
  },
  {
    path: "/inventory",
    element: <Inventory />,
  },
  {
    path: "/vendors",
    element: <Vendors />,
  },
  {
    path: "/services",
    element: <Services />,
  },
  {
    path: "/users",
    element: <UserManagement />,
  },
  {
    path: "/pending-approval",
    element: <PendingApproval />,
  },
  {
    path: "/admin",
    element: <AdminZone />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <RouterProvider router={router} />
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);