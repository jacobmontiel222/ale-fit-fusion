import { logger } from "@/lib/logger";
import { useState, useRef, useEffect, useCallback } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { setFitAIUnread } from "@/lib/fitai";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const MAX_STORED_MESSAGES = 50;

const FityAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem("fityai-chat-history");
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        }
      }
    } catch {
      localStorage.removeItem("fityai-chat-history");
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      try {
        localStorage.setItem("fityai-chat-history", JSON.stringify(toStore));
      } catch {
        try {
          localStorage.setItem("fityai-chat-history", JSON.stringify(toStore.slice(-25)));
        } catch {
          localStorage.removeItem("fityai-chat-history");
        }
      }
    }
    setFitAIUnread(false);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, streamingMessage]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTypingAnimation = useCallback((fullMessage: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsStreaming(true);
    setStreamingMessage("");
    let currentIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentIndex < fullMessage.length) {
        setStreamingMessage(fullMessage.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: fullMessage,
            timestamp: new Date(),
          },
        ]);
        setStreamingMessage("");
      }
    }, 15);
  }, []);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No authenticated session");

      const response = await fetch("https://jacobfityourself.app.n8n.cloud/webhook/fity-chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          message: userMessage.content,
          locale: "es-ES",
          device: "ios",
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const data = await response.json();
      const fullMessage = data.reply || "Lo siento, no pude procesar tu solicitud.";
      startTypingAnimation(fullMessage);
    } catch (error) {
      logger.error("Error al conectar con FityAI:", error);
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

  const formatTime = (date: Date) => {
    const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : i18n.language;
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#1A1A1A" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10" style={{ backgroundColor: "#1A1A1A" }}>
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label={t('common.back') || "Volver"}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <Bot className="w-6 h-6 text-white" />
            <div>
              <h1 className="text-base font-semibold text-white leading-tight">{t('fityai.title')}</h1>
              <p className="text-[11px] text-white/40 leading-tight">Tu asistente fitness</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 gap-4">
              <Bot className="mb-4 h-16 w-16 text-white" />
              <p className="text-lg" style={{ color: "#F1F1F1" }}>
                {t('fityai.welcome')}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {/* Bot avatar */}
                  {message.role === "assistant" && (
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[78%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                    {/* Name label */}
                    {message.role === "assistant" && (
                      <span className="text-[11px] font-semibold text-white/50 mb-1 px-1">
                        FityAI
                      </span>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                      }`}
                      style={{
                        backgroundColor: message.role === "user" ? "#3B3B3B" : "#2C2C2C",
                        color: message.role === "user" ? "#FFFFFF" : "#F1F1F1",
                      }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>

                    <span className="text-[10px] text-white/30 mt-1 px-1">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingMessage && (
                <div className="flex gap-2 justify-start">
                  <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-start max-w-[78%]">
                    <span className="text-[11px] font-semibold text-white/50 mb-1 px-1">FityAI</span>
                    <div
                      className="rounded-2xl rounded-bl-sm px-4 py-3"
                      style={{ backgroundColor: "#2C2C2C", color: "#F1F1F1" }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {streamingMessage}
                        <span className="inline-block w-[2px] h-[14px] bg-white/60 ml-0.5 animate-pulse align-middle" />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading dots */}
              {isLoading && !isStreaming && (
                <div className="flex gap-2 justify-start">
                  <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-start max-w-[78%]">
                    <span className="text-[11px] font-semibold text-white/50 mb-1 px-1">FityAI</span>
                    <div
                      className="rounded-2xl rounded-bl-sm px-4 py-3"
                      style={{ backgroundColor: "#2C2C2C", color: "#F1F1F1" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
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
