-- Create questions table for managing quiz questions
CREATE TABLE public.questions (
  id SERIAL PRIMARY KEY,
  statement TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (quiz needs to work for everyone)
CREATE POLICY "Anyone can read active questions" 
ON public.questions 
FOR SELECT 
USING (active = true);

-- Create policies for admin management (service role only for now)
CREATE POLICY "Service role can manage questions" 
ON public.questions 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_questions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_questions_updated_at_column();

-- Insert existing questions
INSERT INTO public.questions (statement, category, description, order_index) VALUES
  ('De overheid moet meer geld uitgeven aan de zorg.', 'Zorg & Welzijn', 'Dit gaat over de financiering van ziekenhuizen, huisartsen en andere zorgvoorzieningen.', 1),
  ('Nederland moet meer vluchtelingen opnemen.', 'Immigratie & Integratie', 'Over het asielbeleid en de opvang van mensen die op de vlucht zijn voor oorlog of vervolging.', 2),
  ('Het klimaat heeft prioriteit, ook als dat geld kost.', 'Klimaat & Milieu', 'Over de kosten en baten van klimaatmaatregelen zoals het verduurzamen van industrie en transport.', 3),
  ('De belasting op arbeid moet omlaag.', 'Economie & Financiën', 'Over het verlagen van inkomstenbelasting en sociale premies die werknemers betalen.', 4),
  ('Nederland moet meer geld uitgeven aan defensie.', 'Veiligheid & Defensie', 'Over het verhogen van het defensiebudget voor militaire uitrusting en personeel.', 5),
  ('Studenten moeten geen collegegeld betalen.', 'Onderwijs', 'Over de afschaffing van collegegeld voor hoger onderwijs in Nederland.', 6),
  ('Er moeten meer woningen gebouwd worden, ook in natuurgebieden.', 'Wonen', 'Over het oplossen van de woningcrisis door bouwen in beschermde natuurgebieden.', 7),
  ('Grote bedrijven moeten meer belasting betalen.', 'Economie & Financiën', 'Over het verhogen van de winstbelasting voor multinationals en grote ondernemingen.', 8),
  ('Nederland moet uit de Europese Unie stappen.', 'Europa & Buitenland', 'Over het Nederlandse lidmaatschap van de EU en Europese samenwerking.', 9),
  ('Er moet een maximum snelheid van 100 km/u komen op alle wegen.', 'Klimaat & Milieu', 'Over het verlagen van snelheidslimieten ter beperking van uitstoot en stikstofneerslag.', 10),
  ('De AOW-leeftijd moet weer omlaag naar 65 jaar.', 'Zorg & Welzijn', 'Over het verlagen van de pensioenleeftijd van 67 terug naar 65 jaar.', 11),
  ('Cannabis moet volledig gelegaliseerd worden.', 'Veiligheid & Justitie', 'Over het legaliseren van de verkoop en productie van cannabis voor recreatief gebruik.', 12),
  ('Nederland moet kernenergie inzetten om klimaatdoelen te halen.', 'Klimaat & Milieu', 'Over de bouw van nieuwe kerncentrales als onderdeel van de energietransitie.', 13),
  ('De huurprijzen moeten worden bevroren.', 'Wonen', 'Over het stoppen van huurverhogingen om wonen betaalbaarder te maken.', 14),
  ('Er moet een vermogensbelasting komen.', 'Economie & Financiën', 'Over het heffen van belasting op grote vermogens en kapitaal.', 15),
  ('Alle nieuwe auto''s moeten vanaf 2030 elektrisch zijn.', 'Klimaat & Milieu', 'Over het verbieden van de verkoop van nieuwe benzine- en dieselauto''s.', 16),
  ('Nederland moet militaire steun aan Oekraïne blijven geven.', 'Veiligheid & Defensie', 'Over het leveren van wapens en militaire apparatuur aan Oekraïne.', 17),
  ('De zorgverzekering moet weer nationaal geregeld worden.', 'Zorg & Welzijn', 'Over het afschaffen van private zorgverzekeraars ten gunste van een nationaal zorgstelsel.', 18),
  ('Werknemers moeten recht krijgen op een vierdaagse werkweek.', 'Werk & Sociale Zekerheid', 'Over het verkorten van de standaard werkweek van vijf naar vier dagen.', 19),
  ('Nederland moet stoppen met het gebruik van fossiele brandstoffen.', 'Klimaat & Milieu', 'Over het volledig afbouwen van olie, gas en kolen in Nederland.', 20),
  ('Leraren moeten meer verdienen.', 'Onderwijs', 'Over het verhogen van de salarissen in het onderwijs om het beroep aantrekkelijker te maken.', 21),
  ('Er moeten strengere straffen komen voor criminelen.', 'Veiligheid & Justitie', 'Over het verhogen van gevangenisstraffen en andere juridische sancties.', 22),
  ('Nederland moet een basisinkomen invoeren.', 'Werk & Sociale Zekerheid', 'Over het geven van een onvoorwaardelijk inkomen aan alle Nederlandse burgers.', 23),
  ('De veehouderij in Nederland moet flink kleiner worden.', 'Klimaat & Milieu', 'Over het inkrimpen van de veestapel om stikstofuitstoot te verminderen.', 24),
  ('Nederland moet meer internationale handel bedrijven.', 'Economie & Financiën', 'Over het stimuleren van export en import om de Nederlandse economie te versterken.', 25);