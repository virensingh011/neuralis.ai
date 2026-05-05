import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Copy, Check, Loader2, Sparkles, Play, RefreshCw, FileCode2, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash / Shell" },
  { value: "html", label: "HTML + CSS" },
  { value: "react", label: "React (TSX)" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
];

const TASK_TYPES = [
  { value: "generate", label: "Generate Code", icon: Sparkles },
  { value: "debug", label: "Debug & Fix", icon: RefreshCw },
  { value: "explain", label: "Explain Code", icon: FileCode2 },
  { value: "optimize", label: "Optimize", icon: Play },
];

interface CodeResult {
  language: string;
  content: string;
}

export default function Code() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("python");
  const [taskType, setTaskType] = useState("generate");
  const [result, setResult] = useState<CodeResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const buildSystemPrompt = () => {
    const langLabel = LANGUAGES.find(l => l.value === language)?.label ?? language;
    switch (taskType) {
      case "generate":
        return `You are an expert ${langLabel} developer. Generate clean, production-ready, well-commented ${langLabel} code for the user's request. Include:
- A brief explanation of the approach (2-3 sentences)
- The complete code in a fenced code block
- Key notes or usage examples at the end
Be thorough and professional.`;
      case "debug":
        return `You are an expert ${langLabel} debugger. Analyze the provided code, identify all bugs, and provide the fixed version. Format:
1. List of bugs found
2. Fixed code in a fenced code block
3. Explanation of each fix`;
      case "explain":
        return `You are an expert ${langLabel} teacher. Explain the provided code clearly and thoroughly. Cover:
- What the code does overall
- How each major section/function works
- Any patterns, algorithms, or techniques used
- Time/space complexity if relevant`;
      case "optimize":
        return `You are an expert ${langLabel} performance engineer. Analyze the code and provide an optimized version. Format:
1. Identified bottlenecks
2. Optimized code in a fenced code block
3. Explanation of optimizations and performance improvements`;
      default:
        return `You are an expert ${langLabel} developer.`;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    abortRef.current = new AbortController();
    setIsGenerating(true);
    setResult(null);
    setStreamingText("");

    const taskLabel = TASK_TYPES.find(t => t.value === taskType)?.label ?? taskType;
    const langLabel = LANGUAGES.find(l => l.value === language)?.label ?? language;
    const fullPrompt = `Task: ${taskLabel} in ${langLabel}\n\n${prompt}`;

    try {
      const response = await fetch("/api/openai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Code: ${prompt.slice(0, 40)}`, mode: "code" }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error("Failed to create conversation");
      const convo = await response.json() as { id: number };

      const streamRes = await fetch(`/api/openai/conversations/${convo.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-System-Prompt": buildSystemPrompt(),
        },
        body: JSON.stringify({ content: fullPrompt }),
        signal: abortRef.current.signal,
      });

      if (!streamRes.ok) throw new Error("Stream failed");

      const reader = streamRes.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

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
              const data = JSON.parse(dataStr) as { done?: boolean; content?: string };
              if (data.done) {
                setIsGenerating(false);
                setResult({ language, content: fullContent });
                setStreamingText("");
                break;
              }
              if (data.content) {
                fullContent += data.content;
                setStreamingText(fullContent);
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        setStreamingText("An error occurred. Please try again.");
      }
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
    if (streamingText) {
      setResult({ language, content: streamingText });
      setStreamingText("");
    }
  };

  const handleCopy = async () => {
    const text = result?.content ?? streamingText;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText = isGenerating ? streamingText : result?.content ?? "";

  return (
    <div className="flex h-full w-full overflow-hidden p-6 gap-6 relative">
      <div className="absolute top-0 left-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Left Panel — Controls */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 flex flex-col gap-4 shrink-0"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Code Generator</h1>
            <p className="text-xs text-muted-foreground">AI-powered code synthesis</p>
          </div>
        </div>

        {/* Task Type */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Task Type</label>
          <div className="grid grid-cols-2 gap-2">
            {TASK_TYPES.map((task) => {
              const Icon = task.icon;
              return (
                <button
                  key={task.value}
                  onClick={() => setTaskType(task.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all border",
                    taskType === task.value
                      ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                      : "bg-card/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs">{task.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Language</label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="bg-card/40 border-border/50 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt */}
        <div className="space-y-2 flex-1 flex flex-col">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {taskType === "generate" ? "Describe what to build" :
             taskType === "debug" ? "Paste code to debug" :
             taskType === "explain" ? "Paste code to explain" :
             "Paste code to optimize"}
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              taskType === "generate"
                ? "e.g. A binary search tree with insert, delete, and traversal methods..."
                : "Paste your code here..."
            }
            className="flex-1 min-h-[180px] resize-none bg-card/40 border-border/50 font-mono text-sm focus-visible:ring-primary/50"
            data-testid="input-code-prompt"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={isGenerating ? handleStop : handleGenerate}
          disabled={!prompt.trim() && !isGenerating}
          className={cn(
            "w-full h-11 font-semibold shadow-lg transition-all",
            isGenerating && "bg-red-600 hover:bg-red-700"
          )}
          data-testid="button-generate-code"
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Stop Generation</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Generate Code</>
          )}
        </Button>

        {/* Quick examples */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Quick examples:</p>
          {[
            "Binary search algorithm",
            "REST API with authentication",
            "Fibonacci using memoization",
          ].map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="w-full text-left text-xs px-3 py-1.5 rounded-md bg-card/30 border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Right Panel — Output */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col rounded-xl border border-border/50 bg-card/20 overflow-hidden"
      >
        {/* Output Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Output</span>
            {(result || isGenerating) && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {LANGUAGES.find(l => l.value === language)?.label ?? language}
              </Badge>
            )}
          </div>
          {(result || (isGenerating && streamingText)) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-7 px-3 text-xs border-border/50 gap-1.5"
              data-testid="button-copy-code"
            >
              {copied ? <><Check className="h-3 w-3 text-green-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
            </Button>
          )}
        </div>

        {/* Output Content */}
        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">
            {!displayText && !isGenerating ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-muted-foreground"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card/50 border border-border/30 mb-4">
                  <Code2 className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm font-medium">No output yet</p>
                <p className="text-xs mt-1 opacity-60">Configure your options and click Generate Code</p>
              </motion.div>
            ) : (
              <motion.div
                key="output"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose dark:prose-invert prose-sm max-w-none prose-pre:bg-background/80 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl prose-code:text-primary"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayText || "..."}
                </ReactMarkdown>
                {isGenerating && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                    className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/30 bg-card/20 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            Neuralis Code Engine • GPT-4 Powered
          </span>
          {result && (
            <span className="text-[10px] text-green-400 font-mono">Generation complete</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
