import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeWeightSetup, ThemeWeights } from "./ThemeWeightSetup";

export type Answer = "agree" | "disagree" | "neutral" | null;

export interface Question {
  id: number;
  statement: string;
  category: string;
  description?: string;
}

interface QuizInterfaceProps {
  questions: Question[];
  onComplete: (answers: Record<number, Answer>, themeWeights: ThemeWeights) => void;
  onBack: () => void;
}

export const QuizInterface = ({ questions, onComplete, onBack }: QuizInterfaceProps) => {
  const [showThemeSetup, setShowThemeSetup] = useState(true);
  const [showWeights, setShowWeights] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [themeWeights, setThemeWeights] = useState<ThemeWeights>({
    "Zorg & Welzijn": 50,
    "Wonen": 50,
    "Klimaat & Milieu": 50,
    "Immigratie & Integratie": 50,
    "Onderwijs": 50,
    "Economie & Financiën": 50,
    "Veiligheid & Defensie": 50,
    "Europa & Buitenland": 50,
    "Veiligheid & Justitie": 50,
    "Werk & Sociale Zekerheid": 50,
  });

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const currentAnswer = answers[currentQuestion.id];

  const handleAnswer = (answer: Answer) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onComplete(answers, themeWeights);
    }
  };

  const handleStartQuiz = () => {
    setShowThemeSetup(false);
  };

  const handleWeightChange = (themeKey: keyof ThemeWeights, value: number) => {
    setThemeWeights(prev => ({
      ...prev,
      [themeKey]: value
    }));
  };

  const themes = [
    { key: "Zorg & Welzijn" as keyof ThemeWeights, label: "Zorg & Welzijn" },
    { key: "Wonen" as keyof ThemeWeights, label: "Wonen" },
    { key: "Klimaat & Milieu" as keyof ThemeWeights, label: "Klimaat & Milieu" },
    { key: "Onderwijs" as keyof ThemeWeights, label: "Onderwijs" },
    { key: "Economie & Financiën" as keyof ThemeWeights, label: "Economie & Financiën" },
    { key: "Immigratie & Integratie" as keyof ThemeWeights, label: "Immigratie & Integratie" },
    { key: "Veiligheid & Defensie" as keyof ThemeWeights, label: "Veiligheid & Defensie" },
    { key: "Europa & Buitenland" as keyof ThemeWeights, label: "Europa & Buitenland" },
    { key: "Veiligheid & Justitie" as keyof ThemeWeights, label: "Veiligheid & Justitie" },
    { key: "Werk & Sociale Zekerheid" as keyof ThemeWeights, label: "Werk & Sociale Zekerheid" },
  ];

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const canProceed = currentAnswer !== null && currentAnswer !== undefined;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (showThemeSetup) {
    return (
      <ThemeWeightSetup
        themeWeights={themeWeights}
        setThemeWeights={setThemeWeights}
        onContinue={handleStartQuiz}
      />
    );
  }

  return (
    <div className="bg-gradient-background">
      <div className="max-w-full" style={{ padding: '2vh 8vw' }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Terug
            </Button>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowWeights(!showWeights)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Belangweging
              </Button>
              <span className="text-sm text-muted-foreground">
                Vraag {currentQuestionIndex + 1} van {questions.length}
              </span>
            </div>
          </div>
          
          <Progress value={progress} className="h-2" />
        </div>

        {/* Theme Weights Panel */}
        {showWeights && (
          <Card className="p-6 mb-6 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Belangweging per thema</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowWeights(false)}
                >
                  Sluiten
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map((theme) => (
                  <div key={theme.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{theme.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {themeWeights[theme.key]}%
                      </span>
                    </div>
                    <Slider
                      value={[themeWeights[theme.key]]}
                      onValueChange={(value) => handleWeightChange(theme.key, value[0])}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Pas de belangweging aan om te bepalen hoe zwaar verschillende thema's meetellen in je eindresultaat.
              </p>
            </div>
          </Card>
        )}

        {/* Question Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 shadow-card border-0">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-sm font-medium text-primary bg-accent px-3 py-1 rounded-full">
                  {currentQuestion.category}
                </span>
                <h2 className="text-2xl md:text-3xl font-semibold leading-relaxed">
                  {currentQuestion.statement}
                </h2>
                {currentQuestion.description && (
                  <p className="text-muted-foreground text-lg">
                    {currentQuestion.description}
                  </p>
                )}
              </div>

              {/* Answer Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleAnswer("disagree")}
                  className={cn(
                    "h-16 text-lg transition-all duration-300",
                    currentAnswer === "disagree" 
                      ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" 
                      : "hover:shadow-md"
                  )}
                >
                  Oneens
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleAnswer("neutral")}
                  className={cn(
                    "h-16 text-lg transition-all duration-300",
                    currentAnswer === "neutral" 
                      ? "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100" 
                      : "hover:shadow-md"
                  )}
                >
                  Neutraal
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleAnswer("agree")}
                  className={cn(
                    "h-16 text-lg transition-all duration-300",
                    currentAnswer === "agree" 
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" 
                      : "hover:shadow-md"
                  )}
                >
                  Eens
                </Button>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Vorige
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2 bg-gradient-primary hover:shadow-elegant transition-all duration-300"
            >
              {isLastQuestion ? "Bekijk resultaten" : "Volgende"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};