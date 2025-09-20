import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Party, DatabaseParty } from '@/types/party';

// Default party colors for consistent theming
const PARTY_COLORS: Record<string, string> = {
  'VVD': '#0066CC',
  'D66': '#00A0DC',
  'PVV': '#FFD700',
  'CDA': '#00A54F',
  'GroenLinks-PvdA': '#DC2866', // Blend of red and green
  'SP': '#FF0000',
  'FvD': '#8B0000',
  'Partij voor de Dieren': '#006B3F',
  'ChristenUnie': '#007FFF',
  'NSC': '#FF6B35',
  'BBB': '#2E8B57',
  'Volt': '#662D91',
  'JA21': '#1E3A8A',
  'BVNL': '#8B4513',
  'SGP': '#2C5282',
  'DENK': '#00A79D',
  'Vrij Verbond': '#4B5563',
  // Fallback colors for any additional parties
  'default': '#6B7280'
};

// Default party descriptions
const PARTY_DESCRIPTIONS: Record<string, string> = {
  'VVD': 'Liberale partij die inzet op ondernemerschap, lagere belastingen en individuele vrijheid.',
  'D66': 'Democratische partij die focust op onderwijs, innovatie en Europese samenwerking.',
  'PVV': 'Nationalistische partij die kritisch is over immigratie en de EU.',
  'CDA': 'Christendemocratische partij met focus op gezin, zorg en duurzaamheid.',
  'GroenLinks-PvdA': 'Progressieve partij die zich richt op klimaat, sociale rechtvaardigheid en gelijkheid.',
  'SP': 'Socialistische partij die zich inzet voor sociale rechtvaardigheid en publieke voorzieningen.',
  'FvD': 'Conservatieve partij die traditionele waarden en nationale soevereiniteit voorstaat.',
  'Partij voor de Dieren': 'Dierenpartij die opkomt voor dierenrechten, natuur en duurzaamheid.',
  'ChristenUnie': 'Christelijke partij die inzet op rentmeesterschap en zorg voor kwetsbaren.',
  'NSC': 'Nieuwe partij die zich richt op bestuurlijke vernieuwing en betrouwbaar bestuur.',
  'BBB': 'Partij die opkomt voor boeren, burgers en het platteland.',
  'Volt': 'Europese beweging die zich richt op innovatie en Europese samenwerking.',
  'JA21': 'Liberaal-conservatieve partij die zich richt op Nederlandse waarden en normen.',
  'BVNL': 'Partij die zich inzet voor Nederlandse soevereiniteit en democratische waarden.',
  'SGP': 'Staatkundig Gereformeerde Partij met focus op christelijke waarden en traditie.',
  'DENK': 'Partij die zich inzet voor diversiteit, gelijkwaardigheid en gelijke kansen.',
  '50PLUS': 'Partij die opkomt voor de belangen van 50-plussers en ouderen.',
  'Vrij Verbond': 'Partij die zich inzet voor vrijheid, soevereiniteit en democratische waarden.'
};

// Canonical list to guarantee 16 parties in the quiz (top Dutch parties)
const DEFAULT_PARTY_NAMES = [
  'VVD','D66','PVV','CDA','GroenLinks-PvdA','SP','FvD','Partij voor de Dieren',
  'ChristenUnie','NSC','BBB','Volt','JA21','BVNL','SGP','DENK'
];

// Generate default positions for parties based on their political orientation
const generateDefaultPositions = (partyName: string): Record<number, "agree" | "neutral" | "disagree"> => {
  const positions: Record<number, "agree" | "neutral" | "disagree"> = {};
  
  // Initialize all positions as neutral by default
  for (let i = 1; i <= 25; i++) {
    positions[i] = "neutral";
  }
  
  // Comprehensive party profiles based on known political stances
  const partyProfiles: Record<string, Partial<Record<number, "agree" | "neutral" | "disagree">>> = {
    'VVD': {
      // Liberal party: pro-business, lower taxes, strong defense, pro-EU, moderate on climate
      1: "disagree", 2: "agree", 3: "disagree", 4: "agree", 5: "agree",
      6: "disagree", 7: "agree", 8: "disagree", 9: "agree", 10: "disagree",
      11: "agree", 12: "disagree", 13: "disagree", 14: "agree", 15: "neutral",
      16: "disagree", 17: "agree", 18: "disagree", 19: "agree", 20: "agree",
      21: "agree", 22: "disagree", 23: "agree", 24: "disagree", 25: "neutral"
    },
    'D66': {
      // Progressive liberal: pro-EU, education, climate action, social liberal
      1: "disagree", 2: "agree", 3: "disagree", 4: "agree", 5: "agree",
      6: "disagree", 7: "agree", 8: "disagree", 9: "agree", 10: "disagree",
      11: "agree", 12: "disagree", 13: "disagree", 14: "agree", 15: "disagree",
      16: "disagree", 17: "agree", 18: "disagree", 19: "agree", 20: "disagree",
      21: "agree", 22: "disagree", 23: "agree", 24: "disagree", 25: "disagree"
    },
    'PVV': {
      // Populist right: anti-immigration, anti-EU, pro-welfare for natives, tough on crime
      1: "agree", 2: "disagree", 3: "agree", 4: "disagree", 5: "disagree",
      6: "agree", 7: "disagree", 8: "agree", 9: "disagree", 10: "agree",
      11: "disagree", 12: "agree", 13: "agree", 14: "disagree", 15: "agree",
      16: "agree", 17: "disagree", 18: "agree", 19: "disagree", 20: "neutral",
      21: "disagree", 22: "agree", 23: "disagree", 24: "agree", 25: "agree"
    },
    'CDA': {
      // Christian democrat: moderate, family values, environmental stewardship, pro-EU
      1: "neutral", 2: "agree", 3: "disagree", 4: "agree", 5: "agree",
      6: "neutral", 7: "agree", 8: "disagree", 9: "agree", 10: "agree",
      11: "agree", 12: "disagree", 13: "agree", 14: "agree", 15: "agree",
      16: "disagree", 17: "agree", 18: "neutral", 19: "agree", 20: "agree",
      21: "neutral", 22: "agree", 23: "agree", 24: "disagree", 25: "neutral"
    },
    'GroenLinks-PvdA': {
      // Green-left alliance: climate priority, social justice, pro-refugee, wealth redistribution
      1: "agree", 2: "disagree", 3: "agree", 4: "agree", 5: "disagree",
      6: "agree", 7: "disagree", 8: "agree", 9: "disagree", 10: "agree",
      11: "disagree", 12: "agree", 13: "disagree", 14: "disagree", 15: "disagree",
      16: "agree", 17: "disagree", 18: "agree", 19: "disagree", 20: "agree",
      21: "disagree", 22: "agree", 23: "disagree", 24: "disagree", 25: "agree"
    },
    'SP': {
      // Socialist: pro-worker, anti-EU elite, public services, wealth redistribution
      1: "agree", 2: "neutral", 3: "agree", 4: "agree", 5: "neutral",
      6: "agree", 7: "disagree", 8: "agree", 9: "disagree", 10: "agree",
      11: "disagree", 12: "agree", 13: "disagree", 14: "disagree", 15: "neutral",
      16: "agree", 17: "disagree", 18: "agree", 19: "disagree", 20: "agree",
      21: "neutral", 22: "agree", 23: "disagree", 24: "disagree", 25: "agree"
    },
    'FvD': {
      // Conservative right: anti-immigration, climate skeptic, traditional values, Eurosceptic
      1: "agree", 2: "agree", 3: "agree", 4: "disagree", 5: "disagree",
      6: "agree", 7: "disagree", 8: "agree", 9: "disagree", 10: "agree",
      11: "disagree", 12: "agree", 13: "agree", 14: "disagree", 15: "agree",
      16: "agree", 17: "disagree", 18: "agree", 19: "disagree", 20: "neutral",
      21: "disagree", 22: "agree", 23: "disagree", 24: "agree", 25: "neutral"
    },
    'Partij voor de Dieren': {
      // Animal rights: climate priority, animal welfare, sustainable agriculture
      1: "agree", 2: "disagree", 3: "agree", 4: "disagree", 5: "disagree",
      6: "agree", 7: "disagree", 8: "disagree", 9: "disagree", 10: "disagree",
      11: "disagree", 12: "agree", 13: "neutral", 14: "disagree", 15: "disagree",
      16: "agree", 17: "disagree", 18: "disagree", 19: "disagree", 20: "disagree",
      21: "disagree", 22: "disagree", 23: "disagree", 24: "disagree", 25: "agree"
    },
    'ChristenUnie': {
      // Christian social: family values, care for creation, social justice, moderate
      1: "agree", 2: "agree", 3: "agree", 4: "neutral", 5: "agree",
      6: "agree", 7: "agree", 8: "disagree", 9: "agree", 10: "agree",
      11: "agree", 12: "disagree", 13: "agree", 14: "agree", 15: "agree",
      16: "agree", 17: "agree", 18: "neutral", 19: "agree", 20: "agree",
      21: "neutral", 22: "agree", 23: "agree", 24: "disagree", 25: "neutral"
    },
    'NSC': {
      // New party: good governance, pragmatic center, reliable administration
      1: "neutral", 2: "agree", 3: "neutral", 4: "agree", 5: "agree",
      6: "neutral", 7: "agree", 8: "neutral", 9: "agree", 10: "neutral",
      11: "agree", 12: "disagree", 13: "neutral", 14: "agree", 15: "neutral",
      16: "neutral", 17: "agree", 18: "neutral", 19: "agree", 20: "neutral",
      21: "neutral", 22: "neutral", 23: "agree", 24: "disagree", 25: "neutral"
    },
    'BBB': {
      // Farmer-Citizen movement: rural interests, against climate restrictions on farming
      1: "agree", 2: "neutral", 3: "neutral", 4: "neutral", 5: "neutral",
      6: "agree", 7: "neutral", 8: "agree", 9: "neutral", 10: "neutral",
      11: "neutral", 12: "neutral", 13: "neutral", 14: "neutral", 15: "neutral",
      16: "agree", 17: "neutral", 18: "agree", 19: "neutral", 20: "neutral",
      21: "neutral", 22: "neutral", 23: "neutral", 24: "disagree", 25: "neutral"
    },
    'Volt': {
      // European movement: pro-EU, innovation, climate action, progressive
      1: "disagree", 2: "agree", 3: "disagree", 4: "agree", 5: "agree",
      6: "disagree", 7: "agree", 8: "disagree", 9: "agree", 10: "disagree",
      11: "agree", 12: "disagree", 13: "disagree", 14: "agree", 15: "disagree",
      16: "disagree", 17: "agree", 18: "disagree", 19: "agree", 20: "disagree",
      21: "agree", 22: "disagree", 23: "agree", 24: "disagree", 25: "disagree"
    },
    'JA21': {
      // Liberal conservative: Dutch values, moderate right, pro-business
      1: "agree", 2: "agree", 3: "agree", 4: "agree", 5: "agree",
      6: "neutral", 7: "agree", 8: "neutral", 9: "agree", 10: "agree",
      11: "agree", 12: "disagree", 13: "agree", 14: "agree", 15: "neutral",
      16: "neutral", 17: "agree", 18: "neutral", 19: "agree", 20: "neutral",
      21: "agree", 22: "neutral", 23: "agree", 24: "disagree", 25: "neutral"
    },
    'BVNL': {
      // Dutch sovereignty: anti-lockdown, freedom-focused, Eurosceptic
      1: "agree", 2: "neutral", 3: "agree", 4: "neutral", 5: "neutral",
      6: "agree", 7: "neutral", 8: "agree", 9: "neutral", 10: "neutral",
      11: "neutral", 12: "neutral", 13: "agree", 14: "neutral", 15: "neutral",
      16: "neutral", 17: "neutral", 18: "agree", 19: "neutral", 20: "neutral",
      21: "neutral", 22: "neutral", 23: "neutral", 24: "disagree", 25: "neutral"
    },
    'SGP': {
      // Reformed Christian: traditional Christian values, family-focused
      1: "neutral", 2: "agree", 3: "agree", 4: "neutral", 5: "neutral",
      6: "agree", 7: "agree", 8: "agree", 9: "neutral", 10: "agree",
      11: "neutral", 12: "agree", 13: "agree", 14: "agree", 15: "agree",
      16: "agree", 17: "agree", 18: "agree", 19: "neutral", 20: "agree",
      21: "neutral", 22: "agree", 23: "agree", 24: "disagree", 25: "neutral"
    },
    'DENK': {
      // Diversity party: multicultural, social justice, pro-minority rights
      1: "agree", 2: "disagree", 3: "agree", 4: "agree", 5: "disagree",
      6: "agree", 7: "disagree", 8: "disagree", 9: "disagree", 10: "agree",
      11: "disagree", 12: "agree", 13: "neutral", 14: "disagree", 15: "disagree",
      16: "agree", 17: "disagree", 18: "disagree", 19: "disagree", 20: "agree",
      21: "disagree", 22: "agree", 23: "disagree", 24: "disagree", 25: "neutral"
    }
  };
  
  const profile = partyProfiles[partyName];
  if (profile) {
    Object.assign(positions, profile);
  }
  
  return positions;
};

export const useParties = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch distinct parties from the database
      const { data: databaseParties, error: fetchError } = await supabase
        .from('documents')
        .select('id, party, title, url, year, version, inserted_at')
        .order('party');

      if (fetchError) {
        throw fetchError;
      }

      // Group by party name and get the latest document for each party
      const partyMap = new Map<string, DatabaseParty>();
      
      databaseParties?.forEach((doc: any) => {
        const existing = partyMap.get(doc.party);
        if (!existing || new Date(doc.inserted_at) > new Date(existing.inserted_at)) {
          partyMap.set(doc.party, doc);
        }
      });

      // Add any missing parties from the canonical list (for completeness)
      DEFAULT_PARTY_NAMES.forEach((name) => {
        if (!partyMap.has(name)) {
          console.log(`Adding missing party: ${name}`);
          partyMap.set(name, {
            id: crypto.randomUUID(),
            party: name,
            title: `${name} programma` ,
            url: '#',
            year: undefined,
            version: undefined,
            inserted_at: new Date(0).toISOString()
          } as unknown as DatabaseParty);
        }
      });

      console.log(`Total parties after adding defaults: ${partyMap.size}`);

      // Convert to Party objects and sort by name
      const formattedParties: Party[] = Array.from(partyMap.values())
        .map((dbParty) => ({
          id: dbParty.party.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: dbParty.party,
          color: PARTY_COLORS[dbParty.party] || PARTY_COLORS.default,
          description: PARTY_DESCRIPTIONS[dbParty.party] || `${dbParty.party} - Nederlandse politieke partij`,
          positions: generateDefaultPositions(dbParty.party)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setParties(formattedParties);
    } catch (err) {
      console.error('Error fetching parties:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch parties');
    } finally {
      setLoading(false);
    }
  };

  return { parties, loading, error, refetch: fetchParties };
};