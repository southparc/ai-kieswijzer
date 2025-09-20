import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface QualityStats {
  party: string;
  total_chunks: number;
  avg_quality: number;
  themes: string[];
  artifact_percentage: number;
}

interface QualityDashboardProps {
  onBack: () => void;
}

export const QualityDashboard: React.FC<QualityDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<QualityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQualityStats();
  }, []);

  const fetchQualityStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_party_coverage_stats');

      if (fetchError) {
        throw fetchError;
      }

      // Process the results
      const processedStats: QualityStats[] = (data || []).map((row: any) => ({
        party: row.party,
        total_chunks: row.total_chunks,
        avg_quality: Math.round((row.avg_quality || 0) * 100) / 100,
        themes: row.themes || [],
        artifact_percentage: Math.round((row.artifact_percentage || 0) * 100) / 100
      }));

      setStats(processedStats);
    } catch (err) {
      console.error('Error fetching quality stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quality statistics');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityIcon = (quality: number) => {
    if (quality >= 0.8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (quality >= 0.6) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const overallStats = stats.length > 0 ? {
    totalChunks: stats.reduce((sum, s) => sum + s.total_chunks, 0),
    avgQuality: stats.reduce((sum, s) => sum + s.avg_quality, 0) / stats.length,
    avgArtifacts: stats.reduce((sum, s) => sum + s.artifact_percentage, 0) / stats.length,
    partiesWithLowQuality: stats.filter(s => s.avg_quality < 0.6).length
  } : null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Kwaliteitsstatistieken laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onBack} className="mt-4">
          Terug
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kwaliteitsdashboard</h1>
          <p className="text-muted-foreground mt-2">
            Analyse van PDF-verwerking en content kwaliteit per partij
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          Terug naar Hoofdpagina
        </Button>
      </div>

      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Totaal Chunks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalChunks.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gem. Kwaliteit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getQualityColor(overallStats.avgQuality)}`}>
                {Math.round(overallStats.avgQuality * 100)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">OCR Artefacten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(overallStats.avgArtifacts)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lage Kwaliteit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overallStats.partiesWithLowQuality} partijen
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Alerts */}
      {stats.some(s => s.avg_quality < 0.5) && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Kritieke kwaliteitsproblemen gedetecteerd!</strong>
            <br />
            Enkele partijen hebben zeer lage kwaliteitsscores (&lt;50%). 
            Dit kan duiden op slechte OCR, verkeerde chunking, of beschadigde PDF's.
          </AlertDescription>
        </Alert>
      )}

      {/* Party Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Kwaliteit per Partij
          </CardTitle>
          <CardDescription>
            Overzicht van content-kwaliteit, chunk-aantallen en thema-dekking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.party} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{stat.party}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stat.total_chunks.toLocaleString()} chunks
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getQualityIcon(stat.avg_quality)}
                    <span className={`font-semibold ${getQualityColor(stat.avg_quality)}`}>
                      {Math.round(stat.avg_quality * 100)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Kwaliteitscore</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          stat.avg_quality >= 0.8 ? 'bg-green-600' :
                          stat.avg_quality >= 0.6 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(stat.avg_quality * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gebaseerd op OCR-kwaliteit en tekst-structuur
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">OCR Artefacten</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {Math.round(stat.artifact_percentage)}%
                      </span>
                      {stat.artifact_percentage > 10 && (
                        <Badge variant="destructive">Hoog</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentage chunks met OCR-problemen
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Thema's ({stat.themes.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {stat.themes.slice(0, 4).map((theme) => (
                        <Badge key={theme} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                      {stat.themes.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{stat.themes.length - 4} meer
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quality Issues */}
                {(stat.avg_quality < 0.6 || stat.artifact_percentage > 15) && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium text-yellow-800">Mogelijke problemen:</p>
                    <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                      {stat.avg_quality < 0.6 && (
                        <li>Lage kwaliteitscore - mogelijk slechte OCR of formatting</li>
                      )}
                      {stat.artifact_percentage > 15 && (
                        <li>Hoog percentage OCR-artefacten - check PDF-kwaliteit</li>
                      )}
                      {stat.total_chunks < 50 && (
                        <li>Weinig chunks - mogelijk onvoldoende content geëxtraheerd</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button onClick={fetchQualityStats} variant="outline" className="mr-2">
              Ververs Statistieken
            </Button>
            <Button 
              onClick={() => window.open('https://tcdfyajrywylkhqdefbp.supabase.co/dashboard/project/tcdfyajrywylkhqdefbp/editor', '_blank')}
              variant="secondary"
            >
              Database Console
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityDashboard;