import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage = ({ onBack }: AdminPageProps) => {
  const [formData, setFormData] = useState({
    party: "",
    title: "",
    url: "",
    year: "",
    version: ""
  });
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Fout",
        description: "Selecteer alleen PDF bestanden.",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!file || !formData.party || !formData.title) {
      toast({
        title: "Fout", 
        description: "Vul alle vereiste velden in en selecteer een PDF.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload file to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('programs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('programs')
        .getPublicUrl(fileName);

      // Call ingest function
      const { error: ingestError } = await supabase.functions.invoke('ingest', {
        body: {
          party: formData.party,
          title: formData.title,
          url: publicUrl,
          year: formData.year ? parseInt(formData.year) : null,
          version: formData.version || null
        }
      });

      if (ingestError) throw ingestError;

      toast({
        title: "Succes",
        description: "Document succesvol geüpload en verwerkt."
      });

      // Reset form
      setFormData({ party: "", title: "", url: "", year: "", version: "" });
      setFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het uploaden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const [ingestLoading, setIngestLoading] = useState(false);
  const handleIngestFromStorage = async () => {
    setIngestLoading(true);
    try {
      console.log('[Admin] Invoking ingest_from_storage...');
      const { data, error } = await supabase.functions.invoke('ingest_from_storage', {
        body: { reingest: true, defaultYear: new Date().getFullYear() }
      });
      console.log('[Admin] ingest_from_storage result:', { data, error });
      if (error) throw error;
      toast({
        title: 'Indexeren voltooid',
        description: `Bestanden: ${data?.total ?? 0}, verwerkt: ${data?.processed ?? 0}, overgeslagen: ${data?.skipped ?? 0}, fouten: ${data?.errors ?? 0}`,
      });
    } catch (e) {
      console.error('Ingest from storage error:', e);
      toast({ title: 'Fout', description: e instanceof Error ? e.message : 'Indexeren vanuit Storage mislukt.', variant: 'destructive' });
    } finally {
      setIngestLoading(false);
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
          <h1 className="text-3xl font-bold">Beheer Documenten</h1>
        </div>

        {/* Upload Form */}
        <Card className="p-6 max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Document Upload</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="party">Partij *</Label>
              <Input
                id="party"
                value={formData.party}
                onChange={(e) => handleInputChange('party', e.target.value)}
                placeholder="Naam van de politieke partij"
              />
            </div>

            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Titel van het document"
              />
            </div>

            <div>
              <Label htmlFor="year">Jaar</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                placeholder="2024"
              />
            </div>

            <div>
              <Label htmlFor="version">Versie</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
                placeholder="v1.0"
              />
            </div>

            <div>
              <Label htmlFor="file">PDF Bestand *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  Geselecteerd: {file.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button 
                onClick={handleUpload}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploaden...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Inladen (nieuw bestand)
                  </>
                )}
              </Button>

              <Button 
                onClick={handleIngestFromStorage}
                variant="secondary"
                disabled={ingestLoading}
                className="w-full gap-2"
              >
                {ingestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Indexeren...
                  </>
                ) : (
                  <>Indexeer bestaande bestanden</>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};