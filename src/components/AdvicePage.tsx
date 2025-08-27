import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface AdvicePageProps {
  onBack: () => void;
}

interface Source {
  party: string;
  page: number;
  url: string;
}

interface AdviceResult {
  answer: string;
  sources: Source[];
}

interface DocumentStats {
  docCount: number;
  lastUpdate: string;
}

const themes = [
  { key: "zorg", label: "Zorg", color: "bg-red-500" },
  { key: "wonen", label: "Wonen", color: "bg-blue-500" },
  { key: "klimaat", label: "Klimaat", color: "bg-green-500" },
  { key: "migratie", label: "Migratie", color: "bg-orange-500" },
  { key: "onderwijs", label: "Onderwijs", color: "bg-purple-500" },
];

export const AdvicePage = ({ onBack }: AdvicePageProps) => {
  const [question, setQuestion] = useState("");
  const [themeWeights, setThemeWeights] = useState<Record<string, number>>({
    zorg: 50,
    wonen: 50,
    klimaat: 50,
    migratie: 50,
    onderwijs: 50,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdviceResult | null>(null);
  const [stats, setStats] = useState<DocumentStats>({ docCount: 0, lastUpdate: "" });

  useEffect(() => {
    // Set fallback stats for now
    setStats({ docCount: 25, lastUpdate: '27-08-2025' });
  }, []);

  const handleCompare = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ask', {
        body: {
          question: question,
          themes: Object.keys(themeWeights),
          weights: themeWeights,
          ip: "127.0.0.1" // This will be replaced with actual IP in production
        }
      });

      if (error) throw error;

      setResult({
        answer: data.answer || "Geen antwoord beschikbaar.",
        sources: data.sources || []
      });
    } catch (error) {
      console.error('Error getting advice:', error);
      setResult({
        answer: "Er is een fout opgetreden bij het ophalen van het advies. Probeer het opnieuw.",
        sources: []
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Button>
          <h1 className="text-3xl font-bold">Politiek Advies</h1>
        </div>

        {/* Input Section */}
        <Card className="p-6 mb-8">
          <div className="space-y-6">
            {/* Theme Sliders */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Thema's (belangweging)</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map((theme) => (
                  <div key={theme.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{theme.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {themeWeights[theme.key]}%
                      </span>
                    </div>
                    <Slider
                      value={[themeWeights[theme.key]]}
                      onValueChange={(value) =>
                        setThemeWeights(prev => ({ ...prev, [theme.key]: value[0] }))
                      }
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Question Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Jouw vraag</h3>
              <Textarea
                placeholder="Stel een vraag over politieke standpunten, bijvoorbeeld: 'Wat vinden de partijen over sociale huurwoningen?' of 'Hoe staan partijen tegenover het klimaatbeleid?'"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <Button 
              onClick={handleCompare} 
              disabled={!question.trim() || loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vergelijken...
                </>
              ) : (
                "Vergelijk"
              )}
            </Button>
          </div>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Answer */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Resultaat</h2>
              <div className="prose prose-slate max-w-none compact-bullets">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
            </Card>

            {/* Sources */}
            {result.sources && result.sources.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Bronnen</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partij</TableHead>
                      <TableHead>Pagina</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.sources.map((source, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{source.party}</TableCell>
                        <TableCell>{source.page}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(source.url, '_blank')}
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Bekijk document
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground border-t pt-6">
          Laatste update: {stats.lastUpdate} · Documenten: {stats.docCount} · 
          Geen stemadvies; alleen bronvergelijking
        </div>
      </div>
    </div>
  );
};