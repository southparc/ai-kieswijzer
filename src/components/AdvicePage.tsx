import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, ExternalLink, Send, MessageCircle } from "lucide-react";
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AdvicePage = ({ onBack }: AdvicePageProps) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdviceResult | null>(null);
  const [stats, setStats] = useState<DocumentStats>({ docCount: 0, lastUpdate: "" });
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set fallback stats for now
    setStats({ docCount: 25, lastUpdate: '13-09-2025' });
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const handleCompare = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ask', {
        body: {
          question: question,
          ip: "127.0.0.1" // This will be replaced with actual IP in production
        }
      });

      if (error) throw error;

      const resultData = {
        answer: data.answer || "Geen antwoord beschikbaar.",
        sources: data.sources || []
      };

      setResult(resultData);
      
      // Initialize chat with the first Q&A
      setConversationHistory([
        { role: 'user', content: question },
        { role: 'assistant', content: resultData.answer }
      ]);
      
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


  const sendChatMessage = async () => {
    if (!chatMessage.trim() || chatLoading) return;

    const userMessage = chatMessage.trim();
    setChatMessage("");
    setChatLoading(true);

    // Add user message to conversation
    const newHistory = [...conversationHistory, { role: 'user' as const, content: userMessage }];
    setConversationHistory(newHistory);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: userMessage,
          conversationHistory: newHistory.slice(0, -1) // Don't include the message we just added
        }
      });

      if (error) {
        console.error('Chat error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Add assistant response to conversation
      setConversationHistory([...newHistory, { 
        role: 'assistant', 
        content: data.message 
      }]);

    } catch (error) {
      console.error('Error sending chat message:', error);
      // Add error message to chat
      setConversationHistory([...newHistory, { 
        role: 'assistant', 
        content: 'Sorry, er is een fout opgetreden. Probeer het opnieuw.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  return (
    <div className="bg-gradient-background">
      <div className="max-w-full px-[5%] py-4 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Button>
          <h1 className="text-xl md:text-3xl font-bold">Politiek Advies</h1>
        </div>

        {/* Input Section */}
        <Card className="p-6 mb-8">
          <div className="space-y-6">
            {/* Question Input */}
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Jouw vraag</h3>
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
            {/* Chat Interface */}
            <Card className="p-6">
              <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Gesprek over Nederlandse Politiek
              </h3>
              
              {/* Chat History */}
              <div className="mb-4 max-h-64 md:max-h-96 overflow-y-auto border rounded-lg bg-gray-50 p-2 md:p-4 space-y-2 md:space-y-4">
                {conversationHistory.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[80%] p-2 md:p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border shadow-sm'
                    }`}>
                      <div className="prose prose-xs md:prose-sm max-w-none">
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                          <p className="m-0">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border shadow-sm p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">Aan het typen...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Stel een vervolgvraag over Nederlandse politiek..."
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendChatMessage}
                  disabled={!chatMessage.trim() || chatLoading}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Verstuur
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Druk op Enter om je bericht te versturen. Deze chat focust alleen op Nederlandse politiek.
              </p>
            </Card>

            {/* Sources - moved to bottom */}
            {result.sources && result.sources.length > 0 && (
              <Card className="p-6">
                <h3 className="text-base md:text-lg font-semibold mb-4">
                  Bronnen ({result.sources.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partij</TableHead>
                        <TableHead>Pagina</TableHead>
                        <TableHead>Document</TableHead>
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
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 md:mt-12 text-center text-xs md:text-sm text-muted-foreground border-t pt-4 md:pt-6">
          Laatste update: {stats.lastUpdate} · Documenten: {stats.docCount} · 
          Geen stemadvies; alleen bronvergelijking
        </div>
      </div>
    </div>
  );
};