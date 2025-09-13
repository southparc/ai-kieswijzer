import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { AdvicePage } from "@/components/AdvicePage";
import { AdminPage } from "@/components/AdminPage";
import { QuizInterface } from "@/components/QuizInterface";
import { ResultsPage } from "@/components/ResultsPage";
import { questions } from "@/data/questions";
import { calculateResults } from "@/utils/calculateResults";
import { PartyResult } from "@/types/party";
import { useParties } from "@/hooks/useParties";
import { Button } from "@/components/ui/button";

// App state
 type AppState = "landing" | "advice" | "admin" | "quiz" | "results";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [quizResults, setQuizResults] = useState<PartyResult[]>([]);
  const { parties, loading: partiesLoading, error: partiesError } = useParties();

  const handleStart = () => setAppState("advice");
  const handleStartQuiz = () => setAppState("quiz");
  const handleBackToLanding = () => setAppState("landing");
  const handleGoToAdmin = () => setAppState("admin");

  const handleQuizComplete = (answers: Record<number, any>) => {
    if (!parties || parties.length === 0) return;
    const results = calculateResults(answers, parties);
    setQuizResults(results);
    setAppState("results");
  };

  const handleRestartQuiz = () => setAppState("landing");

  // Check for admin access via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const showAdmin = urlParams.get("admin") === "true";

  // Loading state while fetching parties
  if (partiesLoading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Partijen laden...</p>
        </div>
      </div>
    );
  }

  // Error state if parties failed to load
  if (partiesError) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Fout bij het laden van partijen: {partiesError}</p>
          <Button onClick={() => window.location.reload()}>Opnieuw proberen</Button>
        </div>
      </div>
    );
  }

  switch (appState) {
    case "landing":
      return (
        <div>
          <LandingPage onStart={handleStart} onStartQuiz={handleStartQuiz} />
          {showAdmin && (
            <div className="fixed bottom-4 right-4">
              <button
                onClick={handleGoToAdmin}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
              >
                Admin
              </button>
            </div>
          )}
        </div>
      );

    case "advice":
      return <AdvicePage onBack={handleBackToLanding} />;

    case "quiz":
      return (
        <QuizInterface
          questions={questions}
          onComplete={handleQuizComplete}
          onBack={handleBackToLanding}
        />
      );

    case "results":
      return <ResultsPage results={quizResults} onRestart={handleRestartQuiz} />;

    case "admin":
      return <AdminPage onBack={handleBackToLanding} />;

    default:
      return <LandingPage onStart={handleStart} onStartQuiz={handleStartQuiz} />;
  }
};

export default Index;
