import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Vote, BarChart3, Users } from "lucide-react";
import heroImage from "@/assets/hero-democracy.jpg";

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
                  Verkiezingen Kieswijzer
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Ontdek welke politieke partij het beste bij jouw standpunten past. 
                  Beantwoord vragen over belangrijke maatschappelijke onderwerpen en 
                  krijg inzicht in je politieke voorkeur.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={onStart}
                  size="lg"
                  className="bg-gradient-primary hover:shadow-elegant transition-all duration-300 text-lg px-8 py-6"
                >
                  Start Kieswijzer
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                
                <Button 
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 border-primary/20 hover:bg-accent/50 transition-all duration-300"
                >
                  Meer informatie
                </Button>
              </div>

              <div className="flex items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Vote className="h-4 w-4 text-primary" />
                  <span>25 stellingen</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Persoonlijke resultaten</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Alle partijen</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-card">
                <img 
                  src={heroImage} 
                  alt="Nederlandse democratie illustratie"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Hoe werkt het?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover:shadow-card transition-all duration-300 border-0 shadow-sm">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Vote className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Beantwoord stellingen</h3>
              <p className="text-muted-foreground">
                Geef je mening over 25 belangrijke politieke onderwerpen door 
                stellingen te beoordelen.
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-card transition-all duration-300 border-0 shadow-sm">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Krijg resultaten</h3>
              <p className="text-muted-foreground">
                Zie welke partijen het beste aansluiten bij jouw politieke 
                standpunten en overtuigingen.
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-card transition-all duration-300 border-0 shadow-sm">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Vergelijk partijen</h3>
              <p className="text-muted-foreground">
                Bekijk gedetailleerde uitleg per partij en vergelijk hun 
                standpunten met die van jou.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};