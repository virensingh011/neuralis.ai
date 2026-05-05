import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles, Code2, Beaker, Mic, MicOff, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { OpenaiMessage } from "@workspace/api-client-react";

interface StreamingChatProps {
  conversationId: number;
  initialMessages: OpenaiMessage[];
  endpoint: string;
  showModeSelector?: boolean;
}

type SpeechRecognitionEvent = {
  results: { [key: number]: { [key: number]: { transcript: string } } };
  resultIndex: number;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function StreamingChat({ conversationId, initialMessages, endpoint, showModeSelector = true }: StreamingChatProps) {
  const [messages, setMessages] = useState<OpenaiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState("general");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(prev => {
          const base = prev.replace(/\[voice\].*$/s, "").trimEnd();
          return base ? `${base} ${transcript}` : transcript;
        });
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage = input.trim();
    setInput("");

    const tempUserMsg: OpenaiMessage = {
      id: Date.now(),
      conversationId,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setIsStreaming(true);

    try {
      const response = await fetch(endpoint.replace("{id}", conversationId.toString()), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage })
      });

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        conversationId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString()
      }]);

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6);
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                setIsStreaming(false);
                break;
              }
              if (data.content) {
                fullContent += data.content;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastMsg = newMsgs[newMsgs.length - 1];
                  if (lastMsg.role === "assistant") {
                    lastMsg.content = fullContent;
                  }
                  return newMsgs;
                });
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/30 rounded-xl border border-border/50 overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground tracking-tight">Neuralis Intelligence</h2>
        </div>
        {showModeSelector && (
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-[140px] h-8 bg-transparent border-border/50">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">
                <div className="flex items-center gap-2"><Sparkles className="h-3 w-3" /> General</div>
              </SelectItem>
              <SelectItem value="code">
                <div className="flex items-center gap-2"><Code2 className="h-3 w-3" /> Coding</div>
              </SelectItem>
              <SelectItem value="research">
                <div className="flex items-center gap-2"><Beaker className="h-3 w-3" /> Research</div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6 max-w-4xl mx-auto w-full pb-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className="h-8 w-8 mt-1 border border-border/50 shadow-sm shrink-0">
                  {msg.role === "user" ? (
                    <AvatarFallback className="bg-primary/20 text-primary"><User className="h-4 w-4" /></AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-secondary text-secondary-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                  )}
                </Avatar>
                <div
                  className={cn(
                    "px-4 py-3 rounded-2xl max-w-[85%] leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border/50 text-card-foreground rounded-tl-sm prose dark:prose-invert prose-sm max-w-none"
                  )}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || "..."}
                    </ReactMarkdown>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isStreaming && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <Avatar className="h-8 w-8 mt-1 shrink-0">
                <AvatarFallback className="bg-secondary"><Loader2 className="h-4 w-4 animate-spin" /></AvatarFallback>
              </Avatar>
              <div className="px-4 py-3 rounded-2xl bg-card border border-border/50 rounded-tl-sm flex items-center h-11">
                <span className="flex space-x-1">
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="h-2 w-2 bg-primary rounded-full" />
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="h-2 w-2 bg-primary rounded-full" />
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="h-2 w-2 bg-primary rounded-full" />
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-card/50 border-t border-border/50 backdrop-blur-sm">
        {/* Voice indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium"
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="h-2 w-2 rounded-full bg-red-500 inline-block"
              />
              Listening... speak now. Click the mic to stop.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl mx-auto relative flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={isListening ? "Listening to your voice..." : "Query Neuralis... (or use the mic)"}
            className={cn(
              "min-h-[52px] w-full resize-none rounded-xl border-border/50 bg-background py-3 px-4 pr-24 focus-visible:ring-1 focus-visible:ring-primary shadow-inner transition-colors",
              isListening && "border-red-500/50 focus-visible:ring-red-500/50"
            )}
            rows={1}
            data-testid="input-chat"
          />

          {/* Voice button */}
          {voiceSupported && (
            <Button
              size="icon"
              variant="outline"
              onClick={toggleVoice}
              className={cn(
                "absolute bottom-1.5 right-12 h-10 w-10 rounded-lg transition-all",
                isListening
                  ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                  : "border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50"
              )}
              title={isListening ? "Stop listening" : "Start voice input"}
              data-testid="button-voice-input"
            >
              {isListening ? (
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Square className="h-4 w-4 fill-current" />
                </motion.div>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Send button */}
          <Button
            size="icon"
            className="absolute bottom-1.5 right-1.5 h-10 w-10 rounded-lg shadow-md transition-transform active:scale-95"
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-chat"
          >
            {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        <div className="text-center mt-2 text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
          Neuralis Core v2.4 • Secured Connection {voiceSupported && "• Voice Enabled"}
        </div>
      </div>
    </div>
  );
}
