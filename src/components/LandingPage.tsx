import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-ai-kieswijzer.webp";
import { Info, Shield, Clock, Users } from "lucide-react";
import { useUsageCount } from "@/hooks/useUsageCount";

interface LandingPageProps {
  onStart: () => void;
  onStartQuiz: () => void;
}

export const LandingPage = ({ onStart, onStartQuiz }: LandingPageProps) => {
  const { count: usageCount, loading: countLoading } = useUsageCount();

  const formattedUsage =
    new Intl.NumberFormat("nl-NL").format(
      Number.isFinite(usageCount as number) ? (usageCount as number) : 0
    );

  return (
    <div className="bg-gradient-background">
      {/* hero */}
      <div className="relative overflow-hidden">
        <div className="max-w-full px-[5%] py-4 md:py-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-5 sm:space-y-7 text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                nederlandse
                <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  ai kieswijzer
                </span>
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                dit is de experimentele ai-kieswijzer die eind september volledig en up-to-date zal zijn. chat over plannen van de partijen op basis van ai-analyse van alle partijprogramma&apos;s. of doe de quiz voor wie het beste bij je past – met uitleg.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button
                  size="lg"
                  variant="dutch-red"
                  className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-h-[48px]"
                  onClick={onStart}
                >
                  ai advies
                </Button>
                <Button
                  size="lg"
                  variant="dutch-blue"
                  className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-h-[48px]"
                  onClick={onStartQuiz}
                >
                  stemwijzer quiz
                </Button>
              </div>

              {/* usage counter */}
              <div
                className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground text-sm sm:text-base"
                aria-live="polite"
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                {countLoading ? (
                  <span>laden…</span>
                ) : (
                  <span suppressHydrationWarning>
                    {formattedUsage} keer gebruikt
                  </span>
                )}
              </div>

              {/* version */}
              <div className="flex items-center justify-center sm:justify-start text-muted-foreground text-sm sm:text-base">
                <span>v0.42 rag beter, index obv text, chat toegevoegd</span>
              </div>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="nederlandse democratie — stemmen en verkiezingen"
                className="w-full h-auto rounded-2xl shadow-elegant"
              />
            </div>
          </div>
        </div>
      </div>

      {/* info */}
      <div className="max-w-full px-[5%] py-4 md:py-8">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="p-4 sm:p-6 text-left sm:text-center">
            <Info className="h-12 w-12 text-primary sm:mx-auto mb-3 sm:mb-4" />
            <h3 className="text-xl font-semibold mb-2">doel</h3>
            <p className="text-muted-foreground">
              transparante vergelijking van partijstandpunten via ai-analyse van officiële programma&apos;s en documenten.
            </p>
          </Card>

          <Card className="p-4 sm:p-6 text-left sm:text-center">
            <Shield className="h-12 w-12 text-primary sm:mx-auto mb-3 sm:mb-4" />
            <h3 className="text-xl font-semibold mb-2">transparantie</h3>
            <p className="text-muted-foreground">
              alle bronnen worden getoond. antwoorden zijn gebaseerd op verifieerbare partijdocumenten.
            </p>
          </Card>

          <Card className="p-4 sm:p-6 text-left sm:text-center">
            <Clock className="h-12 w-12 text-primary sm:mx-auto mb-3 sm:mb-4" />
            <h3 className="text-xl font-semibold mb-2">laatste update</h3>
            <p className="text-muted-foreground">
              database bijgewerkt op 13 september 2025 met de meest recente partijprogramma&apos;s.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
