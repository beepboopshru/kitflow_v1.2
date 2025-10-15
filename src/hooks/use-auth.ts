import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const isApproved = useQuery(api.roles.isUserApproved);
  const { signIn, signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);

  // This effect updates the loading state once auth is loaded and user data is available
  // It ensures we only show content when both authentication state and user data are ready
  useEffect(() => {
    if (!isAuthLoading && user !== undefined) {
      setIsLoading(false);
    }
  }, [isAuthLoading, user]);

  // Redirect unapproved users to pending approval page
  useEffect(() => {
    if (!isLoading && isAuthenticated && isApproved === false) {
      const publicPaths = ["/", "/auth", "/pending-approval"];
      if (!publicPaths.includes(location.pathname)) {
        navigate("/pending-approval");
      }
    }
  }, [isLoading, isAuthenticated, isApproved, location.pathname, navigate]);

  return {
    isLoading,
    isAuthenticated,
    user,
    isApproved,
    signIn,
    signOut,
  };
}
