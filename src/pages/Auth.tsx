import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Lock, User, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signIn" | "signUp">("signIn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);
  
  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("password", formData);
      
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    } catch (error) {
      console.error("Password sign-in error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (step === "signIn") {
        if (errorMessage.includes("InvalidAccountId") || errorMessage.includes("Account not found")) {
          setError("Account not found. Please create a new account first.");
        } else {
          setError("Invalid username or password. Please try again.");
        }
      } else {
        if (errorMessage.includes("already exists")) {
          setError("Username already exists. Please choose a different username.");
        } else {
          setError("Failed to create account. Please try again.");
        }
      }
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting anonymous sign in...");
      await signIn("anonymous");
      console.log("Anonymous sign in successful");
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center h-full flex-col">
        <Card className="min-w-[350px] pb-0 border shadow-md">
          <CardHeader className="text-center">
            <div className="flex justify-center">
              <img
                src="./logo.svg"
                alt="Lock Icon"
                width={64}
                height={64}
                className="rounded-lg mb-4 mt-4 cursor-pointer"
                onClick={() => navigate("/")}
              />
            </div>
            <CardTitle className="text-xl">
              {step === "signIn" ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {step === "signIn" 
                ? "Enter your credentials to access the system"
                : "Create a new account to get started"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit}>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Username</Label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      placeholder="Enter your username"
                      type="text"
                      className="pl-9"
                      disabled={isLoading}
                      required
                      autoComplete="username"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step === "signUp" ? "Choose a unique username" : "Enter your username"}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      type="password"
                      className="pl-9"
                      disabled={isLoading}
                      required
                      autoComplete={step === "signIn" ? "current-password" : "new-password"}
                    />
                  </div>
                </div>
              </div>
              
              <input type="hidden" name="flow" value={step} />
              
              {error && (
                <p className="mt-4 text-sm text-red-500">{error}</p>
              )}
            </CardContent>
            
            <CardFooter className="flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === "signIn" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>
                    {step === "signIn" ? "Sign In" : "Create Account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep(step === "signIn" ? "signUp" : "signIn");
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full"
              >
                {step === "signIn" ? "Create new account" : "Already have an account? Sign in"}
              </Button>
              
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGuestLogin}
                disabled={isLoading}
              >
                <UserX className="mr-2 h-4 w-4" />
                Continue as Guest
              </Button>
            </CardFooter>
          </form>

          <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t rounded-b-lg">
            Secured by{" "}
            <a
              href="https://vly.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              vly.ai
            </a>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}