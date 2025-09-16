import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RotateCcw, Users, Info, Crown } from "lucide-react";
import { PartyResult } from "@/types/party";
import { calculateCoalitionChances, CoalitionChance } from "@/utils/calculateCoalitionChances";
import { useState, useEffect } from "react";

interface CoalitionPageProps {
  results: PartyResult[];
  onRestart: () => void;
}

const CoalitionDialog = ({ coalition }: { coalition: CoalitionChance }) => {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Coalitiekansen voor {coalition.partyName}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            {coalition.chancePercentage}%
          </div>
          <p className="text-muted-foreground">
            Kans op deelname aan regering
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Uitleg</h4>
            <p className="text-sm text-muted-foreground">
              {coalition.explanation}
            </p>
          </div>
          
          {coalition.mostLikelyCoalitions.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Meest waarschijnlijke coalities</h4>
              <div className="space-y-3">
                {coalition.mostLikelyCoalitions.map((coalitionOption, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-grow">
                        <div className="font-medium text-sm mb-1">
                          {coalition.partyName} + {coalitionOption.partners.join(" + ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {coalitionOption.seats} zetels • {coalitionOption.probability}% waarschijnlijkheid
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Crown className="h-3 w-3" />
                        Meerderheidscoalitie
                      </div>
                    </div>
                    <Progress value={(coalitionOption.seats / 150) * 100} className="h-2" />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export const CoalitionPage = ({ results, onRestart }: CoalitionPageProps) => {
  const [coalitionData, setCoalitionData] = useState<CoalitionChance[]>([]);
  
  useEffect(() => {
    const chances = calculateCoalitionChances(results);
    setCoalitionData(chances.sort((a, b) => b.chancePercentage - a.chancePercentage));
  }, [results]);

  const topCoalitionChance = coalitionData[0];

  return (
    <div className="bg-gradient-background">
      <div className="max-w-full px-[5%] py-4 md:py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Coalitiekansen</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Op basis van huidige peilingen en coalitiegeschiedenis berekenen we de kans 
            dat jouw favoriete partij deel uitmaakt van de volgende regering.
          </p>
        </div>

        {/* Top Coalition Chance */}
        {topCoalitionChance && (
          <Card className="p-8 mb-8 shadow-elegant border-2 border-primary/20 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-primary">
                Beste coalitiekans: {topCoalitionChance.partyName}
              </h2>
              <div className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {topCoalitionChance.chancePercentage}%
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {topCoalitionChance.explanation}
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Info className="h-4 w-4" />
                    Bekijk details
                  </Button>
                </DialogTrigger>
                <CoalitionDialog coalition={topCoalitionChance} />
              </Dialog>
            </div>
          </Card>
        )}

        {/* All Coalition Chances */}
        <div className="max-w-4xl mx-auto space-y-4 mb-8">
          <h3 className="text-2xl font-semibold mb-6">Alle partijen</h3>
          
          {coalitionData.map((coalition, index) => (
            <Card key={coalition.partyName} className="p-6 hover:shadow-card transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 text-center min-w-[3rem]">
                  <div className="text-2xl font-bold text-muted-foreground">
                    #{index + 1}
                  </div>
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xl font-semibold">{coalition.partyName}</h4>
                    <span className="text-lg font-bold text-primary">
                      {coalition.chancePercentage}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={coalition.chancePercentage} 
                    className="mb-3 h-3"
                  />
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {coalition.explanation}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {coalition.mostLikelyCoalitions.length > 0 
                        ? `${coalition.mostLikelyCoalitions.length} mogelijke coalities`
                        : "Geen realistische coalities"
                      }
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Info className="h-3 w-3" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <CoalitionDialog coalition={coalition} />
                    </Dialog>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-center max-w-2xl mx-auto">
          <Button
            onClick={onRestart}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Opnieuw doen
          </Button>
        </div>
      </div>
    </div>
  );
};