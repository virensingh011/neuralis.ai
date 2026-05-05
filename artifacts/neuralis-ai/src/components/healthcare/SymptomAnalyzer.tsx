import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyzeSymptoms } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Info, Loader2, Search } from "lucide-react";

export function SymptomAnalyzer() {
  const [symptomsText, setSymptomsText] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [duration, setDuration] = useState("");
  
  const analyze = useAnalyzeSymptoms();

  const handleAnalyze = () => {
    if (!symptomsText.trim()) return;
    
    analyze.mutate({
      data: {
        symptoms: symptomsText.split(",").map(s => s.trim()).filter(Boolean),
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        duration: duration || undefined
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-5 space-y-6">
        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Analysis Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Reported Symptoms (comma separated)</Label>
              <Textarea 
                placeholder="e.g. sharp chest pain, shortness of breath, dizziness..."
                value={symptomsText}
                onChange={e => setSymptomsText(e.target.value)}
                className="min-h-[120px] resize-none bg-background/50"
                data-testid="input-symptoms"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input 
                  type="number" 
                  placeholder="Years" 
                  value={age} 
                  onChange={e => setAge(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Input 
                placeholder="e.g. 2 days, 3 weeks..." 
                value={duration} 
                onChange={e => setDuration(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <Button 
              className="w-full shadow-lg mt-4" 
              onClick={handleAnalyze}
              disabled={!symptomsText.trim() || analyze.isPending}
              data-testid="button-analyze-symptoms"
            >
              {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
              Run Diagnostic Analysis
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-7">
        <Card className="h-full min-h-[500px] bg-card/20 border-border/50 overflow-hidden flex flex-col shadow-2xl backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {analyze.isPending ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center">
                <div className="relative">
                  <Activity className="h-16 w-16 text-primary opacity-20" />
                  <Loader2 className="h-16 w-16 animate-spin text-primary absolute inset-0" />
                </div>
                <p className="mt-4 font-medium text-primary tracking-widest uppercase text-sm">Synthesizing Medical Data...</p>
              </motion.div>
            ) : analyze.data ? (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 overflow-y-auto h-full">
                <div className="flex items-start gap-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive uppercase tracking-wider text-sm mb-1">Urgency: {analyze.data.urgencyLevel}</h3>
                    <p className="text-sm text-destructive/80 leading-relaxed">{analyze.data.disclaimer}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" /> Potential Differentials
                  </h3>
                  <div className="space-y-3">
                    {analyze.data.possibleConditions.map((condition, idx) => (
                      <div key={idx} className="p-4 bg-card/40 rounded-lg border border-border/50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-foreground">{condition.name}</h4>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                            {condition.likelihood}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" /> Recommended Actions
                  </h3>
                  <ul className="space-y-2">
                    {analyze.data.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground bg-card/20 p-3 rounded-lg border border-border/50">
                        <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                <Activity className="h-16 w-16 mb-4 opacity-10" />
                <p>Input patient symptoms to generate a preliminary differential diagnostic report.</p>
                <p className="text-xs mt-2 opacity-50">Not a substitute for professional medical advice.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
