import { useState, useRef, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import FitAILogo from "@/components/FitAILogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { setFitAIUnread } from "@/lib/fitai";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const FityAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setFitAIUnread(false);
  }, []);

  useEffect(() => {
    // Load chat history from localStorage
    const savedMessages = localStorage.getItem("fityai-chat-history");
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
    }
  }, []);

  useEffect(() => {
    // Save chat history to localStorage
    if (messages.length > 0) {
      localStorage.setItem("fityai-chat-history", JSON.stringify(messages));
    }
    setFitAIUnread(false);
  }, [messages]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, streamingMessage]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("https://jacobfityourself.app.n8n.cloud/webhook/fity-chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id || "anonymous",
          message: userMessage.content,
          locale: "es-ES",
          device: "ios",
        }),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();
      const fullMessage = data.reply || "Lo siento, no pude procesar tu solicitud.";
      
      // Iniciar el efecto de escritura
      setIsStreaming(true);
      setStreamingMessage("");
      
      // Simular escritura progresiva
      let currentIndex = 0;
      const typingSpeed = 15; // milisegundos por carácter
      
      const typeInterval = setInterval(() => {
        if (currentIndex < fullMessage.length) {
          setStreamingMessage(fullMessage.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsStreaming(false);
          
          // Agregar el mensaje completo a la lista
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: fullMessage,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setStreamingMessage("");
        }
      }, typingSpeed);
      
    } catch (error) {
      console.error("Error al conectar con FityAI:", error);
      toast({
        title: "Error",
        description: t('fityai.error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#1A1A1A" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10" style={{ backgroundColor: "#1A1A1A" }}>
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <FitAILogo />
            <h1 className="text-xl font-semibold text-white">{t('fityai.title')}</h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
              <FitAILogo className="mb-4 h-16 w-16" />
              <p className="text-lg" style={{ color: "#F1F1F1" }}>
                {t('fityai.welcome')}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "rounded-br-sm"
                        : "rounded-bl-sm"
                    }`}
                    style={{
                      backgroundColor: message.role === "user" ? "#3B3B3B" : "#2C2C2C",
                      color: message.role === "user" ? "#FFFFFF" : "#F1F1F1",
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p
                      className="text-xs mt-1 opacity-60"
                      style={{ color: message.role === "user" ? "#FFFFFF" : "#F1F1F1" }}
                    >
                      {message.timestamp.toLocaleTimeString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : i18n.language, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3"
                    style={{ backgroundColor: "#2C2C2C", color: "#F1F1F1" }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingMessage}</p>
                  </div>
                </div>
              )}
              {isLoading && !isStreaming && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3"
                    style={{ backgroundColor: "#2C2C2C", color: "#F1F1F1" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
                      </div>
                      <span className="text-sm">{t('fityai.typing')}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div
        className="fixed bottom-16 left-0 right-0 border-t border-white/10"
        style={{ backgroundColor: "#1A1A1A" }}
      >
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('fityai.placeholder')}
              className="flex-1 border-white/20 text-white placeholder:text-white/50"
              style={{ backgroundColor: "#2C2C2C" }}
              disabled={isLoading || isStreaming}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading || isStreaming}
              size="icon"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default FityAI;
