import { LoginModal } from "./components/app/LoginModal";
import { LoggedOutScreen } from "./components/app/LoggedOutScreen";
import { Sidebar } from "./components/app/Sidebar";
import { StartupScreen } from "./components/app/StartupScreen";
import { WorkspacePlaceholder } from "./components/app/WorkspacePlaceholder";
import { useAuth } from "./hooks/useAuth";
import { useProblems } from "./hooks/useProblems";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const { setTheme, isDarkMode } = useTheme();
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
          />
          <WorkspacePlaceholder />
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
