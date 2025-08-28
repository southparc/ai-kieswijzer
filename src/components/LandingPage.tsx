import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-democracy.jpg";
import { Info, Shield, Clock } from "lucide-react";
interface LandingPageProps {
  onStart: () => void;
}
export const LandingPage = ({
  onStart
}: LandingPageProps) => {
  return <div className="min-h-screen bg-gradient-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Nederlandse{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Kieswijzer
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">Hier verschijnt 1 september de experimentele AI-Kieswijzer.
Krijg gepersonaliseerd politiek advies op basis van AI-analyse van alle partijprogramma's. Stel vragen over zorg, wonen, klimaat en meer.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-lg px-8 py-6" onClick={onStart}>
                  Start Kieswijzer
                </Button>
              </div>
            </div>
            <div className="relative">
              <img src={heroImage} alt="Nederlandse democratie - stemmen en verkiezingen" className="w-full h-auto rounded-2xl shadow-elegant" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="container mx-auto px-4 py-16">
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
              Database bijgewerkt op 27 augustus 2025 met de meest recente 
              partijprogramma's.
            </p>
          </Card>
        </div>
      </div>
    </div>;
};