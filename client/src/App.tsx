import { useState } from "react";
import { LoginModal } from "./components/app/LoginModal";
import { LoggedOutScreen } from "./components/app/LoggedOutScreen";
import { Sidebar } from "./components/app/Sidebar";
import { StartupScreen } from "./components/app/StartupScreen";
import { Workspace } from "./components/app/Workspace";
import { cn } from "./lib/utils";
import { useAuth } from "./hooks/useAuth";
import { useProblems } from "./hooks/useProblems";
import { useTheme } from "./hooks/useTheme";
import type { Problem } from "./types/app";

export default function App() {
  const { setTheme, isDarkMode } = useTheme();
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const {
    domain,
    setDomain,
    cookie,
    setCookie,
    sessionToken,
    username,
    authBootstrapState,
    isLoginModalOpen,
    errorMessage,
    isSubmitting,
    isLoggingOut,
    openLoginModal,
    closeLoginModal,
    handleLogin,
    handleLogout,
    handleExit
  } = useAuth();
  const {
    orderedProblems,
    filteredProblemsCount,
    displayPageSize,
    currentPage,
    totalPages,
    setCurrentPage,
    dailyTitleSlug,
    searchQuery,
    setSearchQuery,
    difficultyFilter,
    setDifficultyFilter,
    isProblemsLoading,
    problemsError
  } = useProblems(sessionToken);

  const handleThemeToggle = (checked: boolean) => setTheme(checked ? "dark" : "light");

  return (
    <div className="min-h-full">
      {authBootstrapState === "checking" ? (
        <StartupScreen />
      ) : !sessionToken ? (
        <LoggedOutScreen
          onLogin={openLoginModal}
          onExit={handleExit}
          isDarkMode={isDarkMode}
          onToggleTheme={handleThemeToggle}
        />
      ) : (
        <main className="flex min-h-screen bg-background">
          <div
            className={cn(
              "flex-shrink-0 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out",
              isSidebarOpen
                ? "max-w-md opacity-100 translate-x-0 sm:max-w-[30rem]"
                : "max-w-0 opacity-0 -translate-x-4 pointer-events-none"
            )}
            aria-hidden={!isSidebarOpen}
          >
            <Sidebar
              username={username}
              orderedProblems={orderedProblems}
              filteredProblemsCount={filteredProblemsCount}
              displayPageSize={displayPageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              dailyTitleSlug={dailyTitleSlug}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              difficultyFilter={difficultyFilter}
              onDifficultyChange={setDifficultyFilter}
              isProblemsLoading={isProblemsLoading}
              problemsError={problemsError}
              isDarkMode={isDarkMode}
              onToggleTheme={handleThemeToggle}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              selectedTitleSlug={selectedProblem?.titleSlug ?? null}
              onProblemSelect={setSelectedProblem}
              onToggleSidebar={() => setIsSidebarOpen(false)}
            />
          </div>
          <Workspace
            problem={selectedProblem}
            isDarkMode={isDarkMode}
            sessionToken={sessionToken}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(true)}
          />
        </main>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        domain={domain}
        onDomainChange={setDomain}
        cookie={cookie}
        onCookieChange={setCookie}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onSubmit={handleLogin}
        onClose={closeLoginModal}
        onExit={handleExit}
      />
    </div>
  );
}
