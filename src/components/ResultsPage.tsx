import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RotateCcw, Share2, Download, Trophy, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Answer } from "./QuizInterface";
import { PartyResult, QuestionBreakdown } from "@/types/party";
import { questions } from "@/data/questions";

interface ResultsPageProps {
  results: PartyResult[];
  onRestart: () => void;
}

const BreakdownDialog = ({ 
  breakdown, 
  partyName, 
  type 
}: { 
  breakdown: QuestionBreakdown[], 
  partyName: string, 
  type: 'agreements' | 'disagreements' 
}) => {
  const filteredBreakdown = breakdown.filter(item => 
    type === 'agreements' 
      ? item.result === 'agreement' 
      : item.result === 'disagreement'
  );

  const getAnswerColor = (answer: "agree" | "neutral" | "disagree") => {
    switch (answer) {
      case "agree": return "text-green-600";
      case "disagree": return "text-red-600";
      case "neutral": return "text-yellow-600";
    }
  };

  const getAnswerText = (answer: "agree" | "neutral" | "disagree") => {
    switch (answer) {
      case "agree": return "Eens";
      case "disagree": return "Oneens";
      case "neutral": return "Neutraal";
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {type === 'agreements' ? 'Overeenkomsten' : 'Verschillen'} met {partyName}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {filteredBreakdown.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Geen {type === 'agreements' ? 'overeenkomsten' : 'verschillen'} gevonden.
          </p>
        ) : (
          filteredBreakdown.map((item) => {
            const question = questions.find(q => q.id === item.questionId);
            return (
              <Card key={item.questionId} className="p-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {question?.category}
                  </h4>
                  <p className="font-semibold">
                    {question?.statement}
                  </p>
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Jij: </span>
                      <span className={getAnswerColor(item.userAnswer)}>
                        {getAnswerText(item.userAnswer)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{partyName}: </span>
                      <span className={getAnswerColor(item.partyAnswer)}>
                        {getAnswerText(item.partyAnswer)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </DialogContent>
  );
};

export const ResultsPage = ({ results, onRestart }: ResultsPageProps) => {
  const topMatch = results[0];
  const sortedResults = [...results].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Jouw Kieswijzer Resultaten</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Op basis van jouw antwoorden hebben we berekend welke partijen het beste 
            bij jouw politieke standpunten passen.
          </p>
        </div>

        {/* Top Match */}
        <Card className="p-8 mb-8 shadow-elegant border-2 border-primary/20 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-primary">
              Beste match: {topMatch.party.name}
            </h2>
            <div className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {topMatch.percentage}%
            </div>
            <p className="text-lg text-muted-foreground">
              {topMatch.party.description}
            </p>
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-center hover:bg-muted rounded-lg p-2 transition-colors">
                    <div className="text-2xl font-bold text-green-600">
                      {topMatch.agreements}
                    </div>
                    <div className="flex items-center gap-1">
                      Overeenkomsten <Info className="h-3 w-3" />
                    </div>
                  </button>
                </DialogTrigger>
                <BreakdownDialog 
                  breakdown={topMatch.breakdown} 
                  partyName={topMatch.party.name} 
                  type="agreements" 
                />
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-center hover:bg-muted rounded-lg p-2 transition-colors">
                    <div className="text-2xl font-bold text-red-600">
                      {topMatch.disagreements}
                    </div>
                    <div className="flex items-center gap-1">
                      Verschillen <Info className="h-3 w-3" />
                    </div>
                  </button>
                </DialogTrigger>
                <BreakdownDialog 
                  breakdown={topMatch.breakdown} 
                  partyName={topMatch.party.name} 
                  type="disagreements" 
                />
              </Dialog>
            </div>
          </div>
        </Card>

        {/* All Results */}
        <div className="max-w-4xl mx-auto space-y-4 mb-8">
          <h3 className="text-2xl font-semibold mb-6">Alle partijen</h3>
          
          {sortedResults.map((result, index) => (
            <Card key={result.party.id} className="p-6 hover:shadow-card transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 text-center min-w-[3rem]">
                  <div className="text-2xl font-bold text-muted-foreground">
                    #{index + 1}
                  </div>
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xl font-semibold">{result.party.name}</h4>
                    <span className="text-lg font-bold text-primary">
                      {result.percentage}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={result.percentage} 
                    className="mb-3 h-3"
                  />
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {result.party.description}
                  </p>
                  
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-green-600 hover:underline">
                          {result.agreements} overeenkomsten
                        </button>
                      </DialogTrigger>
                      <BreakdownDialog 
                        breakdown={result.breakdown} 
                        partyName={result.party.name} 
                        type="agreements" 
                      />
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-red-600 hover:underline">
                          {result.disagreements} verschillen
                        </button>
                      </DialogTrigger>
                      <BreakdownDialog 
                        breakdown={result.breakdown} 
                        partyName={result.party.name} 
                        type="disagreements" 
                      />
                    </Dialog>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <Button
            onClick={onRestart}
            variant="outline"
            size="lg"
            className="gap-2 flex-1"
          >
            <RotateCcw className="h-4 w-4" />
            Opnieuw doen
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="gap-2 flex-1"
          >
            <Share2 className="h-4 w-4" />
            Deel resultaat
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="gap-2 flex-1"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};