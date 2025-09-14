import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ChevronRight } from "lucide-react";

export interface ThemeWeights {
  "Zorg & Welzijn": number;
  "Wonen": number; 
  "Klimaat & Milieu": number;
  "Immigratie & Integratie": number;
  "Onderwijs": number;
  "Economie & Financiën": number;
  "Veiligheid & Defensie": number;
  "Europa & Buitenland": number;
  "Veiligheid & Justitie": number;
  "Werk & Sociale Zekerheid": number;
}

const themes = [
  { key: "Zorg & Welzijn" as keyof ThemeWeights, label: "Zorg & Welzijn", description: "Gezondheidszorg, pensioenen, sociale voorzieningen" },
  { key: "Wonen" as keyof ThemeWeights, label: "Wonen", description: "Woningbouw, huurprijzen, hypotheken" },
  { key: "Klimaat & Milieu" as keyof ThemeWeights, label: "Klimaat & Milieu", description: "Duurzaamheid, energietransitie, natuur" },
  { key: "Onderwijs" as keyof ThemeWeights, label: "Onderwijs", description: "Scholen, universiteiten, onderwijskwaliteit" },
  { key: "Economie & Financiën" as keyof ThemeWeights, label: "Economie & Financiën", description: "Belastingen, staatsschuld, economisch beleid" },
  { key: "Immigratie & Integratie" as keyof ThemeWeights, label: "Immigratie & Integratie", description: "Asielbeleid, integratie, migratie" },
  { key: "Veiligheid & Defensie" as keyof ThemeWeights, label: "Veiligheid & Defensie", description: "Leger, internationale veiligheid" },
  { key: "Europa & Buitenland" as keyof ThemeWeights, label: "Europa & Buitenland", description: "EU-beleid, internationale betrekkingen" },
  { key: "Veiligheid & Justitie" as keyof ThemeWeights, label: "Veiligheid & Justitie", description: "Criminaliteit, rechtspraak, politie" },
  { key: "Werk & Sociale Zekerheid" as keyof ThemeWeights, label: "Werk & Sociale Zekerheid", description: "Arbeidsmarkt, uitkeringen, werkgelegenheid" },
];

interface ThemeWeightSetupProps {
  themeWeights: ThemeWeights;
  setThemeWeights: (weights: ThemeWeights) => void;
  onContinue: () => void;
}

export const ThemeWeightSetup = ({ themeWeights, setThemeWeights, onContinue }: ThemeWeightSetupProps) => {
  const handleWeightChange = (themeKey: keyof ThemeWeights, value: number) => {
    setThemeWeights({
      ...themeWeights,
      [themeKey]: value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Wat vind jij belangrijk?</h1>
            <p className="text-lg text-muted-foreground">
              Stel in hoe belangrijk verschillende thema's voor jou zijn. Dit beïnvloedt hoe zwaar je antwoorden meewegen in het eindresultaat.
            </p>
          </div>

          <Card className="p-8 shadow-card border-0">
            <div className="space-y-8">
              <div className="grid gap-6">
                {themes.map((theme) => (
                  <div key={theme.key} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{theme.label}</h3>
                        <p className="text-sm text-muted-foreground">{theme.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary">
                          {themeWeights[theme.key]}%
                        </span>
                      </div>
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

              <div className="text-center pt-6">
                <Button 
                  onClick={onContinue} 
                  size="lg" 
                  className="gap-2 bg-gradient-primary hover:shadow-elegant transition-all duration-300"
                >
                  Start de kieswijzer
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};