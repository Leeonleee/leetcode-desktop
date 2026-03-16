export const StartupScreen = () => (
  <main className="flex min-h-screen items-center justify-center px-4">
    <div className="rounded-3xl border border-border/80 bg-card/80 px-6 py-5 text-center shadow-sm backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Startup</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Checking saved session</h1>
      <p className="mt-2 text-sm text-muted-foreground">Trying cached LeetCode credentials before showing login.</p>
    </div>
  </main>
);
