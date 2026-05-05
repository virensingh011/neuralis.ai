import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerateFlashcards, useListFlashcards, getListFlashcardsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function FlashcardViewer({ sessionId }: { sessionId: number }) {
  const { data: flashcards, isLoading } = useListFlashcards(sessionId, {
    query: { enabled: !!sessionId, queryKey: getListFlashcardsQueryKey(sessionId) }
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!flashcards || flashcards.length === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No flashcards available for this session.</div>;
  }

  const card = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  return (
    <div className="flex flex-col items-center space-y-8 w-full max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between w-full px-4">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Card {currentIndex + 1} of {flashcards.length}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-widest ${
          card.difficulty === 'hard' ? 'bg-destructive/20 text-destructive' :
          card.difficulty === 'medium' ? 'bg-orange-500/20 text-orange-500' :
          'bg-green-500/20 text-green-500'
        }`}>
          {card.difficulty}
        </span>
      </div>

      <div 
        className="relative w-full h-[300px] perspective-[1000px] cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
        data-testid="flashcard-container"
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Front */}
          <Card className="absolute inset-0 backface-hidden bg-card/80 backdrop-blur-md border-primary/20 shadow-xl flex flex-col items-center justify-center p-8 text-center group-hover:shadow-primary/20 transition-all">
            <h3 className="text-2xl font-bold text-foreground leading-relaxed">{card.front}</h3>
            <div className="absolute bottom-4 flex items-center gap-2 text-muted-foreground opacity-50 text-sm">
              <RotateCw className="h-4 w-4" /> Click to flip
            </div>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 backface-hidden bg-primary/10 border-primary/30 shadow-xl flex flex-col items-center justify-center p-8 text-center" style={{ transform: "rotateY(180deg)" }}>
            <p className="text-xl font-medium text-foreground leading-relaxed">{card.back}</p>
          </Card>
        </motion.div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={handlePrev} className="h-12 w-12 rounded-full border-border/50">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleNext} className="h-12 w-12 rounded-full border-border/50">
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
