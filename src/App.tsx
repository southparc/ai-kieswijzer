import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminPage } from "./components/AdminPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen flex flex-col">
        <BrowserRouter>
          <header className="border-b border-border/20 px-[5%] py-4 md:py-8">
            <div className="max-w-full">
              <a href="/" className="inline-block">
                <img 
                  src="/lovable-uploads/e0368849-26ad-4222-9b0a-3db3c5a8810a.png" 
                  alt="AI Kieswijzer Logo" 
                  className="h-[80px] w-auto"
                />
              </a>
            </div>
          </header>
          <main className="flex-1 px-[5%] py-6 md:py-12">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<AdminPage onBack={() => window.location.href = '/'} />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer className="border-t border-border/50 bg-muted/30 px-[5%] py-4 md:py-8">
            <div className="max-w-full">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                De AI-kieswijzer is een experiment van Southparc BV - de uitkomst is gebaseerd op de bekende verkiezingsprogramma's en OpenAI en niet gevalideerd.
              </p>
            </div>
          </footer>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
