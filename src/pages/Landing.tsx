import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 300]);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Parallax Background */}
      <motion.div
        style={{ 
          y,
          backgroundImage: 'url(https://harmless-tapir-303.convex.cloud/api/storage/bddef3fe-4743-496a-9a5e-346357150325)'
        }}
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
      />
      
      {/* Overlay for better text readability */}
      <div className="min-h-screen bg-background/40 backdrop-blur-[2px]">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <img src="https://harmless-tapir-303.convex.cloud/api/storage/fca2c01e-1351-4df7-89a3-ebd2e884bef2" alt="Logo" className="h-12 w-auto" />
            </div>
            
            <div className="flex items-center space-x-4">
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <Button asChild>
                      <Link to="/dashboard">
                        Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link to="/auth">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              ScienceUtsav Management System
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Streamline your kit management with real-time tracking, client database, 
              and packing workflow in one clean interface.
            </p>
            
            {!isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {isAuthenticated ? (
                  <Button size="lg" asChild>
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" asChild>
                    <Link to="/auth">
                      Start Managing
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
      </div>
    </div>
  );
}