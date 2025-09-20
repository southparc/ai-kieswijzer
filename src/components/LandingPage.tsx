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
Chat over plannen van de partijen op basis van AI-analyse van alle partijprogramma's. Of doe de quiz voor wie het beste bij je past - met uitleg.</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button size="lg" variant="dutch-red" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-h-[48px]" onClick={onStart}>
                  AI Advies
                </Button>
                <Button size="lg" variant="dutch-blue" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-h-[48px]" onClick={onStartQuiz}>
                  Stemwijzer Quiz
                </Button>
              </div>
              
          import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// verwacht tabel: public.usage_stats(id int pk, count int)
// met één rij id=1. pas zo nodig table/filters aan.

export function useUsageCount() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("usage_stats")
        .select("count")
        .eq("id", 1)
        .single();

      if (error) throw error;
      const n = Number(data?.count);
      setCount(Number.isFinite(n) ? n : 0);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "onbekende fout");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  // realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("usage-stats-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "usage_stats", filter: "id=eq.1" },
        (payload) => {
          const next = Number((payload.new as any)?.count);
          if (Number.isFinite(next)) setCount(next);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // polling fallback (30s)
  useEffect(() => {
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, [fetchCount]);

  return { count, loading, error, refetch: fetchCount };
}

              
               {/* Version */}
               <div className="flex items-center justify-center sm:justify-start text-muted-foreground text-sm sm:text-base">
                 <span>v0.44 interface aangepast, prompt voor coalitiekans verbeterd,  </span>
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