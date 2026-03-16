import { Moon, Sun } from "lucide-react";

import { Button } from "../ui/button";
import { Switch } from "../ui/switch";

type LoggedOutScreenProps = {
  onLogin: () => void;
  onExit: () => void;
  isDarkMode: boolean;
  onToggleTheme: (checked: boolean) => void;
};

export const LoggedOutScreen = ({ onLogin, onExit, isDarkMode, onToggleTheme }: LoggedOutScreenProps) => (
  <main className="relative min-h-screen">
    <section className="flex min-h-screen animate-fade-up items-center justify-center px-4">
      <div className="space-y-10 text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Leetcode Desktop</h1>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button type="button" size="lg" onClick={onLogin} className="h-14 min-w-44 text-lg">
            Login
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={onExit} className="h-14 min-w-44 text-lg">
            Exit
          </Button>
        </div>
      </div>
    </section>
    <footer className="pointer-events-none fixed inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2 shadow-sm backdrop-blur">
        <Sun className="h-4 w-4 text-muted-foreground" />
        <Switch checked={isDarkMode} onCheckedChange={onToggleTheme} aria-label="Toggle dark mode" />
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>
    </footer>
  </main>
);
