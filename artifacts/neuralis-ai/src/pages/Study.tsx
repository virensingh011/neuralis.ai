import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useListStudySessions, 
  useCreateStudySession,
  useGetStudyStats,
  getListStudySessionsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, BrainCircuit, Library, Plus, Loader2, Play } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FlashcardViewer } from "@/components/study/FlashcardViewer";

export default function Study() {
  const queryClient = useQueryClient();
  const { data: stats } = useGetStudyStats();
  const { data: sessions, isLoading: loadingSessions } = useListStudySessions();
  const [activeSession, setActiveSession] = useState<number | null>(null);

  const createSession = useCreateStudySession();

  const handleNewSession = () => {
    createSession.mutate({ data: { title: "New Study Protocol", subject: "General Science" } }, {
      onSuccess: (newSess) => {
        queryClient.invalidateQueries({ queryKey: getListStudySessionsQueryKey() });
        setActiveSession(newSess.id);
      }
    });
  };

  return (
    <div className="min-h-full w-full p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <header className="space-y-4">
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <BrainCircuit className="mr-2 h-4 w-4" /> Cognitive Enhancement
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          Study Center
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Accelerated learning protocols via AI-generated flashcards, dynamic quizzes, and concept explanations.
        </p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Library className="h-4 w-4 text-primary" /> Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalSessions || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Active Flashcards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalFlashcards || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Quizzes Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalQuizzes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
        {/* Sessions Sidebar */}
        <div className="lg:col-span-4 flex flex-col bg-card/20 rounded-xl border border-border/50 overflow-hidden shadow-xl backdrop-blur-md">
          <div className="p-4 border-b border-border/50 bg-card/40">
            <Button onClick={handleNewSession} className="w-full shadow-md gap-2" disabled={createSession.isPending} data-testid="button-new-session">
              {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Protocol
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {loadingSessions ? (
                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : sessions?.map((sess) => (
                <Card 
                  key={sess.id}
                  onClick={() => setActiveSession(sess.id)}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${activeSession === sess.id ? 'border-primary/50 bg-primary/5 shadow-md' : 'bg-card/40 border-border/50 hover:bg-card/60'}`}
                  data-testid={`card-session-${sess.id}`}
                >
                  <CardContent className="p-4">
                    <h3 className={`font-semibold mb-1 truncate ${activeSession === sess.id ? 'text-primary' : 'text-foreground'}`}>{sess.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="uppercase tracking-wider font-medium">{sess.subject}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {sess.flashcardCount}</span>
                        <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {sess.quizCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-8 flex flex-col bg-card/30 rounded-xl border border-border/50 overflow-hidden shadow-2xl backdrop-blur-sm">
          {activeSession ? (
            <Tabs defaultValue="flashcards" className="flex-1 flex flex-col">
              <div className="p-4 border-b border-border/50 bg-card/40 flex justify-between items-center">
                <TabsList className="bg-background/50 border border-border/50">
                  <TabsTrigger value="flashcards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Flashcards</TabsTrigger>
                  <TabsTrigger value="quiz" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Quiz mode</TabsTrigger>
                  <TabsTrigger value="explain" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Deep Explain</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="flashcards" className="m-0 p-6">
                  <FlashcardViewer sessionId={activeSession} />
                </TabsContent>
                
                <TabsContent value="quiz" className="m-0 p-6 h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground space-y-4">
                    <GraduationCap className="h-16 w-16 mx-auto opacity-20" />
                    <h3 className="text-lg font-medium text-foreground">Interactive Quiz</h3>
                    <p className="max-w-md mx-auto">Test your knowledge with AI-generated multiple choice questions based on this study protocol.</p>
                    <Button variant="outline" className="mt-4 gap-2 border-border/50 shadow-sm"><Play className="h-4 w-4" /> Start Quiz</Button>
                  </div>
                </TabsContent>

                <TabsContent value="explain" className="m-0 p-6 h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground space-y-4">
                    <BrainCircuit className="h-16 w-16 mx-auto opacity-20" />
                    <h3 className="text-lg font-medium text-foreground">Deep Explanation Engine</h3>
                    <p className="max-w-md mx-auto">Request a granular, step-by-step breakdown of any concept within this protocol.</p>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Library className="h-16 w-16 mb-4 opacity-10" />
              <p className="text-lg">Select a study protocol to begin learning.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
