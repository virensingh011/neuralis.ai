import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerateOpenaiImage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ImageIcon, Wand2, Download, Loader2, Maximize2 } from "lucide-react";

export default function ImageGen() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1536x1024" | "1024x1536">("1024x1024");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateImage = useGenerateOpenaiImage();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGeneratedImage(null);
    generateImage.mutate(
      { data: { prompt, size } },
      {
        onSuccess: (res) => {
          setGeneratedImage(`data:image/png;base64,${res.b64_json}`);
        }
      }
    );
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `neuralis-gen-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-full w-full p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <ImageIcon className="h-8 w-8 text-primary" /> Visual Synthesis
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Generate high-fidelity imagery from detailed text prompts using advanced diffusion models.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 space-y-6"
        >
          <Card className="p-5 bg-card/40 backdrop-blur-sm border-border/50 shadow-xl space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Prompt Matrix</label>
              <Textarea 
                placeholder="A futuristic laboratory with bioluminescent plants..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none bg-background/50 border-border/50 focus-visible:ring-primary shadow-inner"
                data-testid="input-image-prompt"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-muted-foreground" /> Resolution
              </label>
              <Select value={size} onValueChange={(val: any) => setSize(val)}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                  <SelectItem value="1536x1024">Landscape (1536x1024)</SelectItem>
                  <SelectItem value="1024x1536">Portrait (1024x1536)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full shadow-lg shadow-primary/20 gap-2" 
              onClick={handleGenerate}
              disabled={!prompt.trim() || generateImage.isPending}
              data-testid="button-generate-image"
            >
              {generateImage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Synthesize Image
            </Button>
          </Card>
        </motion.div>

        {/* Output */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 flex flex-col"
        >
          <Card className="flex-1 min-h-[500px] overflow-hidden bg-card/20 border-border/50 flex flex-col relative group shadow-2xl backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {generateImage.isPending ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-10"
                >
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-6 w-6 rounded-full bg-primary/30 animate-ping" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-medium text-primary tracking-widest uppercase">Processing Request...</p>
                </motion.div>
              ) : generatedImage ? (
                <motion.div 
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full w-full flex items-center justify-center p-4"
                >
                  <div className="relative rounded-lg overflow-hidden shadow-2xl border border-border/50">
                    <img src={generatedImage} alt={prompt} className="max-h-[600px] object-contain rounded-lg" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-4">
                      <Button variant="secondary" size="sm" onClick={handleDownload} className="gap-2" data-testid="button-download-image">
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 text-center"
                >
                  <ImageIcon className="h-16 w-16 mb-4 opacity-10" />
                  <p>Awaiting generation parameters.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
