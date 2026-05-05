import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Image as ImageIcon, 
  CloudSun, 
  BookOpen, 
  Activity, 
  GraduationCap,
  Code2
} from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/code", label: "Code Generator", icon: Code2 },
  { href: "/image", label: "Image Gen", icon: ImageIcon },
  { href: "/weather", label: "Weather", icon: CloudSun },
  { href: "/wiki", label: "Wiki Hub", icon: BookOpen },
  { href: "/healthcare", label: "Healthcare", icon: Activity },
  { href: "/study", label: "Study Center", icon: GraduationCap },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Neuralis<span className="text-primary">.ai</span>
          </h1>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Advanced Intelligence Platform</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));

          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "text-sidebar-primary-foreground bg-sidebar-primary" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`link-sidebar-${link.label.toLowerCase().replace(" ", "-")}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-sidebar-primary shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="text-center text-xs text-muted-foreground">
          <p>Made by Viren Singh</p>
          <p className="mt-1 opacity-50">v1.0.0-beta</p>
        </div>
      </div>
    </div>
  );
}
