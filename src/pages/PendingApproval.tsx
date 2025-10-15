import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Clock, LogOut } from "lucide-react";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isApproved = useQuery(api.roles.isUserApproved);

  useEffect(() => {
    if (isApproved === true) {
      navigate("/dashboard");
    }
  }, [isApproved, navigate]);

  if (isApproved === undefined) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-8">
          <img src="https://honorable-mammoth-993.convex.cloud/api/storage/1467edc0-3490-4b04-9260-93ea45159890" alt="Logo" className="h-12 w-auto" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Clock className="h-16 w-16 text-orange-500" />
              </div>
              <CardTitle className="text-2xl">Pending Approval</CardTitle>
              <CardDescription>
                Your account is waiting for admin approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Welcome, <span className="font-medium">{user?.name || user?.email || "User"}</span>
                </p>
                <p className="text-sm">
                  An administrator needs to approve your account before you can access the system.
                  You'll be automatically redirected once approved.
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  This usually takes a few minutes. You can close this page and come back later.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
