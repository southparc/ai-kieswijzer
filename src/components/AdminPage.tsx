import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Loader2, Edit2, Trash2, Plus, Save, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DatabaseQuestion } from "@/hooks/useQuestions";
import type { User } from '@supabase/supabase-js';

interface AdminPageProps {
  onBack: () => void;
}

const ALLOWED_EMAILS = ['diederik@southparc.nl', 'judith@southparc.nl'];

export const AdminPage = ({ onBack }: AdminPageProps) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

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
  
  // Questions state
  const [questions, setQuestions] = useState<DatabaseQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    statement: "",
    category: "",
    description: ""
  });

  // Auth effect
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch questions
  useEffect(() => {
    if (user && ALLOWED_EMAILS.includes(user.email!)) {
      fetchQuestions();
    }
  }, [user]);

  const fetchQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Fout",
        description: "Kon vragen niet laden",
        variant: "destructive"
      });
    } finally {
      setQuestionsLoading(false);
    }
  };

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
      const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest', {
        body: {
          party: formData.party,
          title: formData.title,
          url: publicUrl,
          year: formData.year ? parseInt(formData.year) : null,
          version: formData.version || null
        }
      });

      if (ingestError) {
        console.error('[Admin] Ingest error:', { ingestError, ingestData });
        throw new Error((ingestData as any)?.details || (ingestData as any)?.error || ingestError.message);
      }

      toast({
        title: "Succes",
        description: (ingestData as any)?.message || "Document succesvol geüpload en verwerkt."
      });

      // Reset form
      setFormData({ party: "", title: "", url: "", year: "", version: "" });
      setFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : 'Er is een fout opgetreden bij het uploaden.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const [ingestLoading, setIngestLoading] = useState(false);
  
  const [healthLoading, setHealthLoading] = useState(false);
  const [health, setHealth] = useState<any | null>(null);
  
  const handleIngestFromStorage = async () => {
    setIngestLoading(true);
    try {
      console.log('[Admin] Invoking ingest_from_storage...');
      const { data, error } = await supabase.functions.invoke('ingest_from_storage', {
        body: { reingest: true, defaultYear: new Date().getFullYear(), maxFiles: 25 }
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

  const handleHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rag_health', {});
      if (error) throw error;
      setHealth(data);
      toast({ title: 'RAG status', description: `Partijen: ${data?.parties?.length ?? 0}, chunks: ${data?.total_chunks ?? 0}, placeholders: ${data?.placeholders ?? 0}` });
    } catch (e) {
      console.error('Health check error:', e);
      toast({ title: 'Fout', description: e instanceof Error ? e.message : 'Health check mislukt', variant: 'destructive' });
    } finally {
      setHealthLoading(false);
    }
  };

  // Question management functions
  const updateQuestion = async (id: number, updates: Partial<DatabaseQuestion>) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Succes",
        description: "Vraag bijgewerkt"
      });
      
      fetchQuestions();
      setEditingQuestion(null);
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Fout",
        description: "Kon vraag niet bijwerken",
        variant: "destructive"
      });
    }
  };

  const deleteQuestion = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze vraag wilt verwijderen?')) return;
    
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Succes",
        description: "Vraag verwijderd"
      });
      
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Fout",
        description: "Kon vraag niet verwijderen",
        variant: "destructive"
      });
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.statement || !newQuestion.category || !newQuestion.description) {
      toast({
        title: "Fout",
        description: "Vul alle velden in",
        variant: "destructive"
      });
      return;
    }

    try {
      const maxOrder = Math.max(...questions.map(q => q.order_index), 0);
      
      const { error } = await supabase
        .from('questions')
        .insert({
          statement: newQuestion.statement,
          category: newQuestion.category,
          description: newQuestion.description,
          order_index: maxOrder + 1,
          active: true
        });

      if (error) throw error;
      
      toast({
        title: "Succes",
        description: "Vraag toegevoegd"
      });
      
      setNewQuestion({ statement: "", category: "", description: "" });
      fetchQuestions();
    } catch (error) {
      console.error('Error adding question:', error);
      toast({
        title: "Fout",
        description: "Kon vraag niet toevoegen",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Succes",
      description: "Uitgelogd"
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) return;
    
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });
      
      if (error) throw error;
      
      toast({
        title: "Succes",
        description: "Ingelogd"
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Fout",
        description: "Inloggen mislukt. Controleer je gegevens.",
        variant: "destructive"
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="bg-gradient-background flex items-center justify-center" style={{ minHeight: '80vh', padding: '0 8vw' }}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Laden...</span>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="bg-gradient-background flex items-center justify-center" style={{ minHeight: '80vh', padding: '0 8vw' }}>
        <div className="w-full max-w-md">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Terug
              </Button>
              <h1 className="text-2xl font-bold">Admin Login</h1>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginLoading || !loginData.email || !loginData.password}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Inloggen...
                  </>
                ) : (
                  'Inloggen'
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Show access denied if not in allowed emails
  if (!ALLOWED_EMAILS.includes(user.email!)) {
    return (
      <div className="bg-gradient-background flex items-center justify-center" style={{ minHeight: '80vh', padding: '0 8vw' }}>
        <div className="w-full max-w-md">
          <Card className="p-6 text-center">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Terug
              </Button>
              <h1 className="text-2xl font-bold">Toegang Geweigerd</h1>
            </div>
            
            <p className="text-muted-foreground mb-4">
              Je hebt geen toegang tot het admin panel.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Ingelogd als: {user.email}
            </p>
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Uitloggen
            </Button>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-background">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Terug
            </Button>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Uitloggen
            </Button>
          </div>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="questions">Quiz Vragen</TabsTrigger>
            <TabsTrigger value="documents">Documenten</TabsTrigger>
          </TabsList>
          
          <TabsContent value="questions" className="space-y-6">
            {/* Add New Question */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Nieuwe Vraag Toevoegen</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-statement">Stelling</Label>
                  <Textarea
                    id="new-statement"
                    value={newQuestion.statement}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, statement: e.target.value }))}
                    placeholder="De overheid moet meer geld uitgeven aan..."
                  />
                </div>
                <div>
                  <Label htmlFor="new-category">Categorie</Label>
                  <Input
                    id="new-category"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Zorg & Welzijn"
                  />
                </div>
                <div>
                  <Label htmlFor="new-description">Beschrijving</Label>
                  <Textarea
                    id="new-description"
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Dit gaat over de financiering van..."
                  />
                </div>
                <Button onClick={addQuestion} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Vraag Toevoegen
                </Button>
              </div>
            </Card>

            {/* Existing Questions */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Bestaande Vragen ({questions.length})</h2>
              {questionsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Laden...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <Card key={question.id} className="p-4">
                      {editingQuestion === question.id ? (
                        <EditQuestionForm
                          question={question}
                          onSave={(updates) => updateQuestion(question.id, updates)}
                          onCancel={() => setEditingQuestion(null)}
                        />
                      ) : (
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-muted-foreground">#{question.id}</span>
                              <span className="text-sm bg-muted px-2 py-1 rounded">{question.category}</span>
                              <span className={`text-sm px-2 py-1 rounded ${question.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {question.active ? 'Actief' : 'Inactief'}
                              </span>
                            </div>
                            <p className="font-medium mb-1">{question.statement}</p>
                            <p className="text-sm text-muted-foreground">{question.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingQuestion(question.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteQuestion(question.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="documents">
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

            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">RAG Gezondheid</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button 
                  onClick={handleHealthCheck}
                  variant="outline"
                  disabled={healthLoading}
                  className="w-full sm:w-auto gap-2"
                >
                  {healthLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Controleren...
                    </>
                  ) : (
                    <>Health check uitvoeren</>
                  )}
                </Button>
              </div>

              {health && (
                <div className="mt-4 text-sm">
                  <div className="mb-2">Totaal chunks: {health.total_chunks} • Placeholders: {health.placeholders}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {health.by_party?.map((p: any) => (
                      <div key={p.party} className="border rounded p-3">
                        <div className="font-medium">{p.party}</div>
                        <div className="text-muted-foreground">chunks: {p.chunks} • placeholders: {p.placeholders}</div>
                        {p.sample && <div className="mt-1 line-clamp-2">{p.sample}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Edit Question Form Component
interface EditQuestionFormProps {
  question: DatabaseQuestion;
  onSave: (updates: Partial<DatabaseQuestion>) => void;
  onCancel: () => void;
}

const EditQuestionForm = ({ question, onSave, onCancel }: EditQuestionFormProps) => {
  const [formData, setFormData] = useState({
    statement: question.statement,
    category: question.category,
    description: question.description,
    active: question.active
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Stelling</Label>
        <Textarea
          value={formData.statement}
          onChange={(e) => setFormData(prev => ({ ...prev, statement: e.target.value }))}
        />
      </div>
      <div>
        <Label>Categorie</Label>
        <Input
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
        />
      </div>
      <div>
        <Label>Beschrijving</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
        />
        <Label htmlFor="active">Actief</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Opslaan
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </div>
  );
};