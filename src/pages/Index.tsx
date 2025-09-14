import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { AdvicePage } from "@/components/AdvicePage";
import { QuizInterface, Answer } from "@/components/QuizInterface";
import { ResultsPage } from "@/components/ResultsPage";
import { useQuestions } from "@/hooks/useQuestions";
import { calculateResults } from "@/utils/calculateResults";
import { PartyResult } from "@/types/party";
import { useParties } from "@/hooks/useParties";
import { Button } from "@/components/ui/button";
import { ThemeWeights } from "@/components/ThemeWeightSetup";

// App state
type AppState = "landing" | "advice" | "quiz" | "results";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [quizResults, setQuizResults] = useState<PartyResult[]>([]);
  const { parties, loading: partiesLoading, error: partiesError } = useParties();
  const { questions, loading: questionsLoading, error: questionsError } = useQuestions();

  const handleStart = () => setAppState("advice");
  const handleStartQuiz = () => setAppState("quiz");
  const handleBackToLanding = () => setAppState("landing");

  const handleQuizComplete = (answers: Record<number, Answer>, themeWeights: ThemeWeights) => {
    if (!parties || parties.length === 0 || !questions || questions.length === 0) return;
    const results = calculateResults(answers, parties, questions, themeWeights);
    setQuizResults(results);
    setAppState("results");
  };

  const handleRestartQuiz = () => setAppState("landing");

  // Loading state while fetching parties or questions
  if (partiesLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {partiesLoading ? 'Partijen laden...' : 'Vragen laden...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state if parties or questions failed to load
  if (partiesError || questionsError) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            Fout bij het laden: {partiesError || questionsError}
          </p>
          <Button onClick={() => window.location.reload()}>Opnieuw proberen</Button>
        </div>
      </div>
    );
  }

  switch (appState) {
    case "landing":
      return <LandingPage onStart={handleStart} onStartQuiz={handleStartQuiz} />;

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

    default:
      return <LandingPage onStart={handleStart} onStartQuiz={handleStartQuiz} />;
  }
};

export default Index;
