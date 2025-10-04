import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-ai-kieswijzer.webp";
import { Info, Shield, Clock, Users } from "lucide-react";
import { useUsageCount } from "@/hooks/useUsageCount";
interface LandingPageProps {
  onStart: () => void;
  onStartQuiz: () => void;
  onViewQuality: () => void;
}
export const LandingPage = ({
  onStart,
  onStartQuiz,
  onViewQuality
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
               <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">Dit is de experimentele AI-Kieswijzer dmv ChatGPT en alle programmas'. 
Chat met AI over alle partijprogramma's. Of doe de quiz voor wie het beste bij je past - met uitleg op basis van programma én stemgedrag. Coalitiekansen inschatting zijn nog vrij onbetrouwbaar. .</p>
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
                  {countLoading 
                   ? 'Laden...' 
                     : `${((usageCount + 1000) * 2).toLocaleString('nl-NL')} keer gebruikt`}
</span>

              </div>
              
               {/* Version */}
               <div className="flex items-center justify-center sm:justify-start text-muted-foreground text-sm sm:text-base">
                 <span>versie: 0.8 prompt aanpassing, vragen neutraler<br />
                       hierna: layout verbeteren</span>
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
              officiële programma's en stemgedrag.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Transparantie</h3>
            <p className="text-muted-foreground">
              Alle bronnen worden getoond. Antwoorden zijn gebaseerd op 
              verifieerbare verkiezingprgramma's.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Laatste Update</h3>
            <p className="text-muted-foreground">
              Bijgewerkt: prompts 24 sept, database op 13 sept, layout 23 sept, .
            </p>
          </Card>
           <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-h-[48px] bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 border-2 border-yellow-200 hover:border-yellow-300" onClick={onViewQuality}>
                  Data kwaliteit
                </Button>
        </div>
      </div>
    </div>;
};