import { useState } from "react";
import { motion } from "framer-motion";
import { 
  useListHealthcareConversations, 
  useGetHealthcareConversation,
  useCreateHealthcareConversation,
  getGetHealthcareConversationQueryKey,
  getListHealthcareConversationsQueryKey
} from "@workspace/api-client-react";
import { StreamingChat } from "@/components/chat/StreamingChat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Activity, HeartPulse, Loader2, Stethoscope } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SymptomAnalyzer } from "@/components/healthcare/SymptomAnalyzer";

export default function Healthcare() {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading: loadingConvos } = useListHealthcareConversations();
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: activeConvo, isLoading: loadingActive } = useGetHealthcareConversation(activeId!, {
    query: { enabled: !!activeId, queryKey: getGetHealthcareConversationQueryKey(activeId!) }
  });

  const createConvo = useCreateHealthcareConversation();

  const handleNewConsultation = () => {
    createConvo.mutate({ data: { title: "New Consultation", specialty: "General" } }, {
      onSuccess: (newConvo) => {
        queryClient.invalidateQueries({ queryKey: getListHealthcareConversationsQueryKey() });
        setActiveId(newConvo.id);
      }
    });
  };

  if (!activeId && conversations?.length && conversations.length > 0) {
    setActiveId(conversations[0].id);
  }

  return (
    <div className="flex flex-col h-full w-full p-6 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <header className="shrink-0 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <HeartPulse className="h-8 w-8 text-primary" /> Healthcare Guidance
        </h1>
        <p className="text-muted-foreground">Advanced medical intelligence for preliminary consultation and symptom analysis.</p>
      </header>

      <Tabs defaultValue="consultations" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-card/50 border border-border/50 shrink-0 w-[400px]">
          <TabsTrigger value="consultations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1">
            <Stethoscope className="h-4 w-4 mr-2" /> Consultations
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1">
            <Activity className="h-4 w-4 mr-2" /> Symptom Analyzer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultations" className="flex-1 min-h-0 mt-4 m-0 data-[state=active]:flex gap-6">
          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 shrink-0 flex flex-col bg-card/40 border border-border/50 rounded-xl overflow-hidden backdrop-blur-md"
          >
            <div className="p-4 border-b border-border/50">
              <Button onClick={handleNewConsultation} className="w-full shadow-lg gap-2" disabled={createConvo.isPending} data-testid="button-new-consultation">
                {createConvo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                New Consultation
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {loadingConvos ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : conversations?.map((convo) => (
                  <div
                    key={convo.id}
                    onClick={() => setActiveId(convo.id)}
                    className={cn(
                      "group flex flex-col gap-1 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all",
                      activeId === convo.id 
                        ? "bg-primary/20 border border-primary/30 text-foreground shadow-sm" 
                        : "text-muted-foreground border border-transparent hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Stethoscope className={cn("h-4 w-4 shrink-0", activeId === convo.id ? "text-primary" : "")} />
                      <span className="truncate font-medium">{convo.title}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider opacity-60 ml-6">{convo.specialty}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>

          {/* Main Chat Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 rounded-xl overflow-hidden shadow-2xl bg-background"
          >
            {activeId ? (
              loadingActive || !activeConvo ? (
                <div className="h-full w-full flex items-center justify-center bg-card/20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <StreamingChat 
                  key={activeId} 
                  conversationId={activeId} 
                  initialMessages={activeConvo.messages} 
                  endpoint={`/api/healthcare/conversations/{id}/messages`}
                />
              )
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-card/20 text-muted-foreground">
                <HeartPulse className="h-12 w-12 mb-4 opacity-20" />
                <p>Select or create a consultation to begin</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="analyzer" className="flex-1 min-h-0 mt-4 m-0 data-[state=active]:block">
          <SymptomAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
