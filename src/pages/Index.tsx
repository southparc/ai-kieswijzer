import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { AdvicePage } from "@/components/AdvicePage";
import { AdminPage } from "@/components/AdminPage";
import { QuizInterface } from "@/components/QuizInterface";
import { ResultsPage } from "@/components/ResultsPage";
import { questions } from "@/data/questions";
import { parties } from "@/data/parties";
import { calculateResults } from "@/utils/calculateResults";

type AppState = "landing" | "advice" | "admin" | "quiz" | "results";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [quizResults, setQuizResults] = useState<any[]>([]);

  const handleStart = () => {
    setAppState("advice");
  };

  const handleStartQuiz = () => {
    setAppState("quiz");
  };

  const handleBackToLanding = () => {
    setAppState("landing");
  };

  const handleGoToAdmin = () => {
    setAppState("admin");
  };

  const handleQuizComplete = (answers: Record<number, any>) => {
    const results = calculateResults(answers, parties);
    const sortedResults = results.sort((a, b) => b.matchPercentage - a.matchPercentage);
    setQuizResults(sortedResults);
    setAppState("results");
  };

  const handleRestartQuiz = () => {
    setAppState("landing");
  };

  // Check for admin access via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const showAdmin = urlParams.get('admin') === 'true';

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
      return <QuizInterface 
        questions={questions} 
        onComplete={handleQuizComplete} 
        onBack={handleBackToLanding} 
      />;
    
    case "results":
      return <ResultsPage 
        results={quizResults} 
        onRestart={handleRestartQuiz} 
      />;
    
    case "admin":
      return <AdminPage onBack={handleBackToLanding} />;
    
    default:
      return <LandingPage onStart={handleStart} onStartQuiz={handleStartQuiz} />;
  }
};

export default Index;