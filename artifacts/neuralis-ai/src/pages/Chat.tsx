import { useState } from "react";
import { motion } from "framer-motion";
import { 
  useListOpenaiConversations, 
  useGetOpenaiConversation,
  useCreateOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  getListOpenaiConversationsQueryKey
} from "@workspace/api-client-react";
import { StreamingChat } from "@/components/chat/StreamingChat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Chat() {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading: loadingConvos } = useListOpenaiConversations();
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: activeConvo, isLoading: loadingActive } = useGetOpenaiConversation(activeId!, {
    query: { enabled: !!activeId, queryKey: getGetOpenaiConversationQueryKey(activeId!) }
  });

  const createConvo = useCreateOpenaiConversation();

  const handleNewChat = () => {
    createConvo.mutate({ data: { title: "New Conversation", mode: "general" } }, {
      onSuccess: (newConvo) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveId(newConvo.id);
      }
    });
  };

  // Set initial active chat
  if (!activeId && conversations?.length && conversations.length > 0) {
    setActiveId(conversations[0].id);
  }

  return (
    <div className="flex h-full w-full overflow-hidden p-6 gap-6 relative">
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-64 flex flex-col bg-card/40 border border-border/50 rounded-xl overflow-hidden backdrop-blur-md"
      >
        <div className="p-4 border-b border-border/50">
          <Button onClick={handleNewChat} className="w-full shadow-lg gap-2" disabled={createConvo.isPending} data-testid="button-new-chat">
            {createConvo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Analysis
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
                  "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all",
                  activeId === convo.id 
                    ? "bg-primary/20 text-primary font-medium shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{convo.title}</span>
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
              endpoint={`/api/openai/conversations/{id}/messages`}
            />
          )
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-card/20 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Select or create a conversation to begin</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
