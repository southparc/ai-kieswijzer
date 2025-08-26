import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Answer = "agree" | "disagree" | "neutral" | null;

export interface Question {
  id: number;
  statement: string;
  category: string;
  description?: string;
}

interface QuizInterfaceProps {
  questions: Question[];
  onComplete: (answers: Record<number, Answer>) => void;
  onBack: () => void;
}

export const QuizInterface = ({ questions, onComplete, onBack }: QuizInterfaceProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});

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
      onComplete(answers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const canProceed = currentAnswer !== null && currentAnswer !== undefined;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Terug
            </Button>
            <span className="text-sm text-muted-foreground">
              Vraag {currentQuestionIndex + 1} van {questions.length}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
        </div>

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