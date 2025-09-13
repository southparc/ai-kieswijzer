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
  'DENK': 'Partij die zich inzet voor diversiteit, gelijkwaardigheid en gelijke kansen.'
};

// Canonical list to guarantee at least 16 parties in the quiz
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
  
  // Override with party-specific positions based on general political orientation
  // This is a simplified approach - in a real system, you'd have more sophisticated logic
  const partyProfiles: Record<string, Partial<Record<number, "agree" | "neutral" | "disagree">>> = {
    'VVD': {
      4: "agree", 5: "agree", 7: "agree", 13: "agree", 16: "agree", 17: "agree", 22: "agree", 25: "agree",
      2: "disagree", 6: "disagree", 8: "disagree", 9: "disagree", 10: "disagree", 11: "disagree", 14: "disagree", 15: "disagree", 18: "disagree", 19: "disagree", 23: "disagree"
    },
    'GroenLinks-PvdA': {
      1: "agree", 2: "agree", 3: "agree", 6: "agree", 8: "agree", 10: "agree", 12: "agree", 14: "agree", 15: "agree", 16: "agree", 17: "agree", 18: "agree", 19: "agree", 20: "agree", 21: "agree", 23: "agree", 24: "agree",
      5: "disagree", 7: "disagree", 9: "disagree", 22: "disagree"
    },
    'PVV': {
      1: "agree", 4: "agree", 5: "agree", 9: "agree", 11: "agree", 14: "agree", 18: "agree", 21: "agree", 22: "agree",
      2: "disagree", 3: "disagree", 6: "disagree", 10: "disagree", 12: "disagree", 15: "disagree", 16: "disagree", 17: "disagree", 19: "disagree", 20: "disagree", 23: "disagree", 24: "disagree", 25: "disagree"
    },
    // Add more party-specific profiles as needed
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

      // Ensure we always include our canonical list (fallbacks if missing in DB)
      DEFAULT_PARTY_NAMES.forEach((name) => {
        if (!partyMap.has(name)) {
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