import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Box, 
  LogOut, 
  Package, 
  Users 
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
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-8">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            <span className="text-xl font-semibold tracking-tight">Inventory</span>
          </Link>
          
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

      {/* Global Chatbot Widget */}
      <div className="fixed bottom-4 right-4 z-50">
        {chatOpen ? (
          <Card className="w-80 shadow-lg">
            <CardContent className="p-0 flex flex-col h-96">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-medium">KitFlow Assistant</div>
                <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`text-sm ${m.role === "assistant" ? "text-foreground" : "text-foreground"}`}
                  >
                    <div
                      className={`rounded-md px-3 py-2 inline-block max-w-[85%] ${
                        m.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSend} className="border-t p-3 flex items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about kits, stock, etc."
                />
                <Button type="submit" size="sm">
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setChatOpen(true)}>Chat with AI</Button>
        )}
      </div>
    </div>
  );
}