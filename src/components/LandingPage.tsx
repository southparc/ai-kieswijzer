import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-ai-kieswijzer.webp";
import { Info, Shield, Clock, Users } from "lucide-react";
import { useUsageCount } from "@/hooks/useUsageCount";
interface LandingPageProps {
  onStart: () => void;
  onStartQuiz: () => void;
}
export const LandingPage = ({
  onStart,
  onStartQuiz
}: LandingPageProps) => {
  const { count: usageCount, loading: countLoading } = useUsageCount();
  return <div className="bg-gradient-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-full px-[5%] py-4 md:py-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                Nederlandse<br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  AI Kieswijzer
                </span>
              </h1>
               <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">Dit is de experimentele AI-Kieswijzer die eind september volledig en up-to-data zal zijn.
Krijg gepersonaliseerd stemadvies op basis van AI-analyse van alle partijprogramma's. Stel vragen over zorg, wonen, klimaat en meer.</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button size="lg" variant="dutch-red" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-h-[48px]" onClick={onStart}>
                  AI Advies
                </Button>
                <Button size="lg" variant="dutch-blue" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-h-[48px]" onClick={onStartQuiz}>
                  Stemwijzer Quiz
                </Button>
              </div>
              
              {/* Usage Counter */}
              <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground text-sm sm:text-base">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>
                  {countLoading ? 'Laden...' : `${usageCount.toLocaleString('nl-NL')} keer gebruikt`}
                </span>
              </div>
              
               {/* Version */}
               <div className="flex items-center justify-center sm:justify-start text-muted-foreground text-sm sm:text-base">
                 <span>v0.42 RAG beter, index obv text, chat toegevoegd </span>
               </div>
            </div>
            <div className="relative">
              <img src={heroImage} alt="Nederlandse democratie - stemmen en verkiezingen" className="w-full h-auto rounded-2xl shadow-elegant" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="max-w-full px-[5%] py-4 md:py-8">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <Info className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Doel</h3>
            <p className="text-muted-foreground">
              Transparante vergelijking van partijstandpunten via AI-analyse van 
              officiële programma's en documenten.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Transparantie</h3>
            <p className="text-muted-foreground">
              Alle bronnen worden getoond. Antwoorden zijn gebaseerd op 
              verifieerbare partijdocumenten.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Laatste Update</h3>
            <p className="text-muted-foreground">
              Database bijgewerkt op 13 september 2025 met de meest recente 
              partijprogramma's.
            </p>
          </Card>
        </div>
      </div>
    </div>;
};