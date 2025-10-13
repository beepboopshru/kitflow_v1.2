import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  // AI Chatbot state
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
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "There was an error contacting the AI. Please try again." },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <img src="https://harmless-tapir-303.convex.cloud/api/storage/1467edc0-3490-4b04-9260-93ea45159890" alt="Logo" className="h-12 w-auto" />
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
              Science Utsav Management System
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

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything you need
            </h2>
            <p className="text-muted-foreground text-lg">
              Built for simplicity and efficiency
            </p>
          </motion.div>
        </div>
      </section>

      {/* Chatbot Widget */}
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
                    className={`text-sm ${
                      m.role === "assistant" ? "text-foreground" : "text-foreground"
                    }`}
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