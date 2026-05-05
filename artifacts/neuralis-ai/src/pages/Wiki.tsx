import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchWikipedia, useGetWikipediaSummary, getGetWikipediaSummaryQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Search, ArrowRight, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Wiki() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchWikipedia(
    { query: searchQuery, limit: 10 },
    { query: { enabled: !!searchQuery, queryKey: ["searchWikipedia", searchQuery] } }
  );

  const { data: article, isLoading: isLoadingArticle } = useGetWikipediaSummary(
    { title: selectedTitle || "" },
    { query: { enabled: !!selectedTitle, queryKey: getGetWikipediaSummaryQueryKey({ title: selectedTitle || "" }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      setSelectedTitle(null);
    }
  };

  return (
    <div className="min-h-full w-full p-8 max-w-7xl mx-auto space-y-6 relative flex flex-col">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" /> Knowledge Repository
        </h1>
        
        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search the global encyclopedia..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-12 text-lg bg-card/50 border-border/50 shadow-inner focus-visible:ring-primary"
              data-testid="input-wiki-search"
            />
          </div>
          <Button type="submit" size="lg" className="px-8 shadow-lg" disabled={isSearching} data-testid="button-search-wiki">
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Query"}
          </Button>
        </form>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[500px]">
        {/* Results List */}
        <div className="lg:col-span-4 flex flex-col bg-card/20 rounded-xl border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-card/40 backdrop-blur-sm">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Search Results</h2>
          </div>
          <ScrollArea className="flex-1 h-[500px]">
            <div className="p-2 space-y-1">
              {!searchQuery && !isSearching && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Enter a query to search Wikipedia.
                </div>
              )}
              {isSearching && (
                <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              )}
              {searchResults?.map((result) => (
                <div
                  key={result.title}
                  onClick={() => setSelectedTitle(result.title)}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-secondary/50 group ${selectedTitle === result.title ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                >
                  <h3 className={`font-medium mb-1 group-hover:text-primary transition-colors ${selectedTitle === result.title ? 'text-primary' : 'text-foreground'}`}>
                    {result.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Article Detail */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {isLoadingArticle ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center bg-card/20 rounded-xl border border-border/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
            ) : article ? (
              <motion.div 
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* AI Summary Card */}
                <Card className="bg-primary/5 border-primary/20 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-primary font-semibold mb-3">
                      <Sparkles className="h-5 w-5" /> Neuralis Executive Summary
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{article.aiSummary}</p>
                  </CardContent>
                </Card>

                {/* Main Article Content */}
                <Card className="bg-card/40 border-border/50 shadow-xl overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-start justify-between gap-6 mb-6">
                      <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{article.title}</h2>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="outline" size="sm" className="gap-2">
                          Wikipedia <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                    
                    <div className="prose dark:prose-invert prose-lg max-w-none text-muted-foreground">
                      <p className="leading-relaxed whitespace-pre-wrap">{article.extract}</p>
                    </div>

                    {article.relatedTopics?.length > 0 && (
                      <div className="mt-12 pt-8 border-t border-border/50">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Related Entities</h3>
                        <div className="flex flex-wrap gap-2">
                          {article.relatedTopics.map(topic => (
                            <span 
                              key={topic} 
                              className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors"
                              onClick={() => {
                                setSearchQuery(topic);
                                setSelectedTitle(topic);
                                setSearchInput(topic);
                              }}
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center bg-card/20 rounded-xl border border-border/50 text-muted-foreground">
                <BookOpen className="h-16 w-16 mb-4 opacity-10" />
                <p className="text-lg">Select an entity to view detailed analysis.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
