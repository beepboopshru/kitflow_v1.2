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
  Building2
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Add AI Chatbot state and action
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Hi! I'm KitFlow Assistant. Ask me about kits, inventory, or stock status." },
  ]);
  const sendChat = useAction(api.ai.chat);

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

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Kits", href: "/kits", icon: Box },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Assignments", href: "/assignments", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Boxes },
    { name: "Vendors", href: "/vendors", icon: Building2 },
    { name: "Services", href: "/services", icon: Package },
    { name: "Admin Zone", href: "/admin", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-8">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <img src="https://honorable-mammoth-993.convex.cloud/api/storage/1467edc0-3490-4b04-9260-93ea45159890" alt="Logo" className="h-12 w-auto" />
          </Link>
          
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

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 border-r border-border bg-card">
          <div className="p-8">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
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

      {/* AI Chat Sidebar */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setChatOpen(false)}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="ml-auto relative w-full sm:w-96 bg-card border-l border-border flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="font-semibold text-lg">Science Utsav AI Manager</div>
              <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}>
                Close
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[85%] ${
                      m.role === "assistant" 
                        ? "bg-muted text-foreground" 
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <p className="text-sm">{m.content}</p>
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
          </motion.div>
        </div>
      )}
      
      {/* Floating AI Button */}
      {!chatOpen && (
        <Button 
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          Chat with AI
        </Button>
      )}
    </div>
  );
}