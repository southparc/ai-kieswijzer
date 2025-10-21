import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Share2, RotateCcw, Users, FileText, Vote, Info, AlertTriangle, CheckCircle, X, Minus, ExternalLink } from "lucide-react";
import type { DualPartyResult } from "@/types/dualScoring";

interface DualResultsPageProps {
  results: DualPartyResult[];
  onRestart: () => void;
  onViewCoalition?: () => void;
  explanation: string;
  hasVotingData: boolean;
}

const ScoreDisplay: React.FC<{
  label: string;
  score: number;
  breakdown: any;
  icon: React.ReactNode;
  hasLimitedData?: boolean;
}> = ({ label, score, breakdown, icon, hasLimitedData }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
        {hasLimitedData && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Beperkte stemdata beschikbaar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{score}%</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
          </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1 text-xs">
                <p>Ruwe score: {breakdown.rawScore}%</p>
                <p>Dekking: {Math.round(breakdown.coverage * 100)}%</p>
                <p>Penalty: {breakdown.penalty}%</p>
                <p>Beantwoord: {breakdown.answered}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
    <Progress value={score} className="h-2" />
  </div>
);

const BreakdownDialog: React.FC<{
  party: DualPartyResult;
  type: 'program' | 'votes';
}> = ({ party, type }) => {
  const breakdown = party[type];
  const title = type === 'program' ? 'Programma Details' : 'Stemgedrag Details';
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title} - {party.party.name}</DialogTitle>
          <DialogDescription>
            Gedetailleerde uitslag en overeenkomsten
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Eindscore</p>
              <p className="text-2xl font-bold text-primary">{breakdown.score}%</p>
            </div>
            <div>
              <p className="font-medium">Ruwe score</p>
              <p className="text-lg">{breakdown.rawScore}%</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">Analyse</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{breakdown.matches} matches</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-red-600" />
                <span>{breakdown.conflicts} conflicten</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="w-4 h-4 text-yellow-600" />
                <span>{breakdown.neutralAlign} neutraal</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span>{breakdown.partialAlign} gedeeltelijk</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">Betrouwbaarheid</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Dekking:</span>
                <span>{Math.round(breakdown.coverage * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Penalty:</span>
                <span>{breakdown.penalty}%</span>
              </div>
              <div className="flex justify-between">
                <span>Beantwoord:</span>
                <span>{breakdown.answered} vragen</span>
              </div>
            </div>
            
            {breakdown.answered < 12 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Lage betrouwbaarheid: minder dan 12 antwoorden
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const DualResultsPage: React.FC<DualResultsPageProps> = ({
  results,
  onRestart,
  onViewCoalition,
  explanation,
  hasVotingData
}) => {
  const [selectedParty, setSelectedParty] = useState<DualPartyResult | null>(null);
  
  if (!results || results.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Geen resultaten beschikbaar</p>
          <Button onClick={onRestart}>Opnieuw beginnen</Button>
        </Card>
      </div>
    );
  }

  const topResult = results[0];
  const otherResults = results.slice(1);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Nederlandse AI Kieswijzer - Mijn Resultaten',
        text: `Mijn beste match: ${topResult.party.name} (${topResult.combined}%)`,
        url: window.location.href
      });
    } catch {
      // Fallback to clipboard
      navigator.clipboard?.writeText(
        `Mijn AI Kieswijzer resultaat: ${topResult.party.name} (${topResult.combined}%)\n${window.location.href}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Jouw Politieke Match</h1>
          <p className="text-muted-foreground">
            Gebaseerd op programma's en stemgedrag in de Tweede Kamer
          </p>
        </div>

        {/* Top Result */}
        <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: topResult.party.color }}
                  />
                  {topResult.party.name}
                </CardTitle>
                <CardDescription className="mt-2 text-lg">
                  {topResult.party.description}
                </CardDescription>
              </div>
              <Badge variant="default" className="text-xl px-4 py-2">
                {topResult.combined}% match
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dual Scores */}
            <div className="grid md:grid-cols-2 gap-4">
              <ScoreDisplay
                label="Programma"
                score={topResult.program.score}
                breakdown={topResult.program}
                icon={<FileText className="w-4 h-4 text-blue-600" />}
              />
              <ScoreDisplay
                label="Stemgedrag"
                score={topResult.votes.score}
                breakdown={topResult.votes}
                icon={<Vote className="w-4 h-4 text-green-600" />}
                hasLimitedData={topResult.hasLimitedVotingData}
              />
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Programma matches: {topResult.program.matches}</span>
              <span>Stemgedrag matches: {topResult.votes.matches}</span>
              <span>Dekking: {Math.round(topResult.program.coverage * 100)}%</span>
              {topResult.program.answered < 12 && (
                <Badge variant="destructive">Lage betrouwbaarheid</Badge>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <BreakdownDialog party={topResult} type="program" />
              <BreakdownDialog party={topResult} type="votes" />
            </div>
            
            {topResult.party.cpbAnalysisUrl && (
              <a
                href={topResult.party.cpbAnalysisUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                <ExternalLink className="w-4 h-4" />
                Bekijk CPB economische analyse
              </a>
            )}
          </CardContent>
        </Card>

        {/* Other Results */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold">Andere partijen</h2>
          {otherResults.map((result, index) => (
            <Card key={result.party.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">
                      #{index + 2}
                    </span>
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: result.party.color }}
                    />
                    <h3 className="font-semibold">{result.party.name}</h3>
                    {result.hasLimitedVotingData && (
                      <Badge variant="secondary" className="text-xs">
                        Beperkte stemdata
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">
                    {result.combined}%
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Programma</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={result.program.score} className="h-1.5 flex-1" />
                      <span className="text-sm font-medium">{result.program.score}%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Vote className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-muted-foreground">Stemgedrag</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={result.votes.score} className="h-1.5 flex-1" />
                      <span className="text-sm font-medium">{result.votes.score}%</span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <BreakdownDialog party={result} type="program" />
                    <BreakdownDialog party={result} type="votes" />
                  </div>
                </div>

                {/* Quick summary */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{result.program.matches + result.votes.matches} totale matches</span>
                  <span>{result.program.conflicts + result.votes.conflicts} conflicten</span>
                  {result.program.answered < 12 && (
                    <span className="text-red-600">Lage betrouwbaarheid</span>
                  )}
                </div>
                
                {result.party.cpbAnalysisUrl && (
                  <a
                    href={result.party.cpbAnalysisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Bekijk CPB economische analyse
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Explanation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Uitleg van de scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{explanation}</p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={onRestart} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Opnieuw doen
          </Button>
          
          <Button onClick={handleShare} variant="outline" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Delen
          </Button>
        </div>

        {/* Voting Data Status */}
        {!hasVotingData && (
          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Let op: Er is momenteel beperkte stemgedrag-data beschikbaar. 
              De scores zijn voornamelijk gebaseerd op partijprogramma's.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default DualResultsPage;
