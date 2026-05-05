import { motion } from "framer-motion";
import { useGetOpenaiStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Activity, 
  GraduationCap, 
  Zap 
} from "lucide-react";
import { Link } from "wouter";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function StatCard({ title, value, icon: Icon, isLoading }: { title: string; value?: number; icon: any; isLoading: boolean }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg transition-all hover:bg-card hover:shadow-primary/10 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              {value?.toLocaleString() || 0}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeatureLink({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: any }) {
  return (
    <Link href={href}>
      <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/30 p-6 transition-all hover:bg-card hover:border-primary/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative z-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetOpenaiStats();

  return (
    <div className="min-h-full w-full p-8 relative">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="mx-auto max-w-6xl space-y-12"
      >
        <header className="space-y-4">
          <motion.div variants={itemVariants} className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Zap className="mr-2 h-4 w-4" />
            System Online
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground">
            Welcome to Neuralis<span className="text-primary">.ai</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="max-w-2xl text-lg text-muted-foreground">
            Your advanced intelligence platform for research, analysis, and generation. 
            Select a module to begin your session.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Conversations" value={stats?.totalConversations} icon={MessageSquare} isLoading={isLoading} />
          <StatCard title="Images Generated" value={stats?.imagesGenerated} icon={ImageIcon} isLoading={isLoading} />
          <StatCard title="Study Sessions" value={stats?.studySessions} icon={GraduationCap} isLoading={isLoading} />
          <StatCard title="Health Consultations" value={stats?.healthConsultations} icon={Activity} isLoading={isLoading} />
        </div>

        <motion.div variants={itemVariants} className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">Active Modules</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureLink 
              href="/chat" 
              title="AI Chat" 
              description="Engage in deep analytical conversations, code generation, and research with the core model."
              icon={MessageSquare} 
            />
            <FeatureLink 
              href="/image" 
              title="Image Generation" 
              description="Synthesize high-fidelity images from detailed text prompts using advanced diffusion models."
              icon={ImageIcon} 
            />
            <FeatureLink 
              href="/study" 
              title="Study Center" 
              description="Accelerate learning with AI-generated flashcards, dynamic quizzes, and concept explanations."
              icon={GraduationCap} 
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
