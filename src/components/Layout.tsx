import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  BarChart3,
  Box,
  LogOut,
  Package,
  Users,
  AlertTriangle,
  Building2,
  Trash2,
  FileText,
  Boxes,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const CHAT_STORAGE_KEY = "science_utsav_chat_history";
const CHAT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, isApproved } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect unapproved users
  useEffect(() => {
    if (isApproved === false) {
      navigate("/pending-approval");
    }
  }, [isApproved, navigate]);

  if (isApproved === false) {
    return null;
  }

  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!stored) return [{ role: "assistant" as const, content: "Hi! I'm ScienceUtsav AI Manager. Ask me about kits, inventory, or stock status." }];
      
      const { messages, timestamp } = JSON.parse(stored);
      const now = Date.now();
      
      // Check if history has expired (older than 1 day)
      if (now - timestamp > CHAT_EXPIRY_MS) {
        localStorage.removeItem(CHAT_STORAGE_KEY);
        return [{ role: "assistant" as const, content: "Hi! I'm ScienceUtsav AI Manager. Ask me about kits, inventory, or stock status." }];
      }
      
      return messages;
    } catch {
      return [{ role: "assistant" as const, content: "Hi! I'm ScienceUtsav AI Manager. Ask me about kits, inventory, or stock status." }];
    }
  };

  // Add AI Chatbot state and action
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(loadChatHistory);
  const sendChat = useAction(api.ai.chat);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 1) { // Only save if there's more than just the initial greeting
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
        messages,
        timestamp: Date.now()
      }));
    }
  }, [messages]);

  const handleClearChat = () => {
    if (!window.confirm("Clear conversation? This cannot be undone.")) return;
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([{ role: "assistant", content: "Hi! I'm ScienceUtsav AI Manager. Ask me about kits, inventory, or stock status." }]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = chatInput.trim();
    if (!input) return;
    setMessages((m) => [...m, { role: "user", content: input }]);
    setChatInput("");
    try {
      const res = await sendChat({ message: input });
      const content = (res as any)?.content || "Sorry, I couldn't generate a response.";
      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "There was an error contacting the AI. Please try again." },
      ]);
    }
  };

  // Get current user role for navigation filtering
  const currentUserRole = user?.role;

  // Define navigation items with role-based access
  const allNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3, roles: ["admin", "manager", "research_development", "operations", "inventory", "content"] },
    { name: "Kits", href: "/kits", icon: Box, roles: ["admin", "manager", "research_development", "content"] },
    { name: "Clients", href: "/clients", icon: Users, roles: ["admin", "manager"] },
    { name: "Assignments", href: "/assignments", icon: Package, roles: ["admin", "manager"] },
    { name: "Inventory", href: "/inventory", icon: Boxes, roles: ["admin", "manager", "operations", "inventory"] },
    { name: "Vendors", href: "/vendors", icon: Building2, roles: ["admin", "manager", "operations", "inventory"] },
    { name: "Services", href: "/services", icon: Package, roles: ["admin", "manager", "operations"] },
    { name: "Laser Files", href: "/laser-files", icon: FileText, roles: ["admin", "manager", "research_development", "operations", "laser_operator"] },
    { name: "Admin Zone", href: "/admin", icon: AlertTriangle, roles: ["admin"] },
  ];

  // Filter navigation based on user role
  const navigation = allNavigation.filter(
    (item) => currentUserRole && item.roles.includes(currentUserRole)
  );

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Background */}
      <div
        style={{ 
          backgroundImage: 'url(https://harmless-tapir-303.convex.cloud/api/storage/bddef3fe-4743-496a-9a5e-346357150325)'
        }}
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
      />
      
      {/* Overlay for better text readability */}
      <div className="min-h-screen bg-background/40 backdrop-blur-[2px]">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <Link to="/dashboard" className="flex items-center space-x-3">
                <img src="https://harmless-tapir-303.convex.cloud/api/storage/fca2c01e-1351-4df7-89a3-ebd2e884bef2" alt="Logo" className="h-12 w-auto" />
              </Link>
            </div>
            
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-semibold tracking-tight">Management System</span>
            </div>
            
            <div className="flex items-center space-x-6">
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.email || "User"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          <motion.nav
            initial={false}
            animate={{
              width: sidebarOpen ? 256 : 0,
              opacity: sidebarOpen ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-r border-border/50 bg-card/60 backdrop-blur-md overflow-hidden shadow-lg self-stretch"
          >
            <div className="p-6 bg-background/10 backdrop-blur-sm">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:scale-[1.01]"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.nav>

          {/* Toggle Button for Desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex absolute left-0 top-20 z-10 h-10 w-6 rounded-r-md border-r border-t border-b border-border/50 bg-card/70 backdrop-blur-md hover:bg-card/90 shadow-md transition-all duration-300"
            style={{ left: sidebarOpen ? '256px' : '0px', transition: 'left 0.3s ease-in-out' }}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          {/* Main Content */}
          <main className="flex-1 pr-96">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-8"
            >
              {children}
            </motion.div>
          </main>
        </div>

        {/* AI Chat Sidebar - Always Visible */}
        <div className="fixed right-0 top-16 bottom-0 w-96 z-40 bg-card border-l border-border flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="font-semibold text-lg">ScienceUtsav AI Manager</div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearChat}
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
              
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[85%] text-sm ${
                    m.role === "assistant" 
                      ? "bg-muted text-foreground" 
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSend} className="border-t p-4 flex items-center gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about kits, stock, etc."
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}