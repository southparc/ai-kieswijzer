import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { QuizInterface, Answer } from "@/components/QuizInterface";
import { ResultsPage } from "@/components/ResultsPage";
import { questions } from "@/data/questions";
import { parties } from "@/data/parties";
import { calculateResults } from "@/utils/calculateResults";

type AppState = "landing" | "quiz" | "results";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [results, setResults] = useState<any[]>([]);

  const handleStartQuiz = () => {
    setAppState("quiz");
    setAnswers({});
  };

  const handleQuizComplete = (userAnswers: Record<number, Answer>) => {
    setAnswers(userAnswers);
    const calculatedResults = calculateResults(userAnswers, parties);
    setResults(calculatedResults);
    setAppState("results");
  };

  const handleRestart = () => {
    setAppState("landing");
    setAnswers({});
    setResults([]);
  };

  const handleBackToLanding = () => {
    setAppState("landing");
  };

  switch (appState) {
    case "landing":
      return <LandingPage onStart={handleStartQuiz} />;
    
    case "quiz":
      return (
        <QuizInterface 
          questions={questions}
          onComplete={handleQuizComplete}
          onBack={handleBackToLanding}
        />
      );
    
    case "results":
      return (
        <ResultsPage 
          results={results}
          onRestart={handleRestart}
        />
      );
    
    default:
      return <LandingPage onStart={handleStartQuiz} />;
  }
};

export default Index;