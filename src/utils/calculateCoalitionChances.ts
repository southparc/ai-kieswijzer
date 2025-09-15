import { Party, PartyResult } from "@/types/party";

// Current polling data based on Peilingwijzer (September 2025)
// Source: https://peilingwijzer.tomlouwerse.nl/ - Updated: 03-09-2025
const CURRENT_POLLING_SEATS: Record<string, number> = {
  'PVV': 32,           // 29-35 seats range
  'GroenLinks-PvdA': 25, // 23-27 seats range  
  'VVD': 16,           // 14-18 seats range - significant decline
  'CDA': 24,           // 22-26 seats range - major comeback!
  'D66': 11,           // 10-12 seats range
  'NSC': 1,            // 0-1 seats range - dramatic collapse!
  'SP': 6,             // 5-7 seats range
  'Partij voor de Dieren': 5, // 4-6 seats range
  'BBB': 5,            // 4-6 seats range
  'ChristenUnie': 4,   // 3-5 seats range
  'SGP': 3,            // 2-4 seats range
  'Volt': 3,           // 2-4 seats range
  'DENK': 4,           // 3-5 seats range
  'JA21': 9,           // 7-11 seats range - significant gain!
  'FvD': 3,            // 2-4 seats range
  'BVNL': 2            // Estimated based on similar parties
};

// Coalition compatibility matrix - defines which parties won't work together
const COALITION_INCOMPATIBILITIES: Record<string, string[]> = {
  'PVV': ['GroenLinks-PvdA', 'D66', 'Volt', 'DENK', 'Partij voor de Dieren', 'SP'], // Left parties won't work with PVV
  'VVD': ['PVV', 'SP', 'Partij voor de Dieren'], // VVD explicitly ruled out PVV
  'GroenLinks-PvdA': ['PVV', 'FvD', 'JA21', 'BVNL'], // Left won't work with far-right
  'D66': ['PVV', 'FvD', 'SGP', 'JA21', 'BVNL'], // Progressive liberals avoid far-right/religious conservatives
  'CDA': [], // Most flexible coalition partner
  'NSC': ['PVV', 'FvD'], // New party, avoids populist right
  'SP': ['VVD', 'PVV', 'FvD', 'JA21', 'BVNL'], // Socialist, won't work with right-wing parties
  'ChristenUnie': ['PVV', 'FvD', 'DENK'], // Christian party has some restrictions
  'SGP': ['GroenLinks-PvdA', 'D66', 'SP', 'Volt', 'DENK', 'Partij voor de Dieren'], // Conservative Christian
  'BBB': ['GroenLinks-PvdA', 'Partij voor de Dieren'], // Farmers party conflicts with green parties
  'Volt': ['PVV', 'FvD', 'SGP', 'JA21', 'BVNL'], // Pro-EU progressives
  'Partij voor de Dieren': ['PVV', 'FvD', 'BBB', 'JA21', 'BVNL'], // Animal rights conflicts with farmers/right
  'FvD': ['GroenLinks-PvdA', 'D66', 'NSC', 'SP', 'Volt', 'DENK', 'Partij voor de Dieren'], // Far-right isolationist
  'JA21': ['GroenLinks-PvdA', 'D66', 'SP', 'Volt', 'DENK', 'Partij voor de Dieren'], // Conservative right
  'BVNL': ['GroenLinks-PvdA', 'D66', 'SP', 'Volt', 'DENK', 'Partij voor de Dieren'], // Right-wing populist
  'DENK': ['PVV', 'FvD', 'SGP', 'JA21', 'BVNL'] // Immigrant rights party
};

// Calculate ideological distance between parties (0-1, lower = more compatible)
const calculateIdeologicalDistance = (party1: string, party2: string): number => {
  // Simplified left-right scale (0 = far left, 10 = far right)
  const partyPositions: Record<string, number> = {
    'SP': 1,
    'GroenLinks-PvdA': 2.5,
    'Partij voor de Dieren': 3,
    'DENK': 3.5,
    'Volt': 4,
    'D66': 4.5,
    'CDA': 5.5,
    'ChristenUnie': 6,
    'NSC': 6.5,
    'VVD': 7,
    'SGP': 7.5,
    'BBB': 8,
    'JA21': 8.5,
    'BVNL': 9,
    'FvD': 9.5,
    'PVV': 9.5
  };

  const pos1 = partyPositions[party1] || 5;
  const pos2 = partyPositions[party2] || 5;
  
  return Math.abs(pos1 - pos2) / 10; // Normalize to 0-1
};

// Check if two parties can form a coalition together
const canCoalition = (party1: string, party2: string): boolean => {
  const incompatible1 = COALITION_INCOMPATIBILITIES[party1] || [];
  const incompatible2 = COALITION_INCOMPATIBILITIES[party2] || [];
  
  return !incompatible1.includes(party2) && !incompatible2.includes(party1);
};

// Generate all possible coalitions with at least 76 seats
const generatePossibleCoalitions = (parties: Party[]): Array<{
  parties: string[];
  seats: number;
  stability: number;
}> => {
  const coalitions: Array<{
    parties: string[];
    seats: number;
    stability: number;
  }> = [];

  const partyNames = parties.map(p => p.name);
  
  // Generate all possible combinations (2^n combinations)
  for (let i = 1; i < Math.pow(2, partyNames.length); i++) {
    const coalition: string[] = [];
    let totalSeats = 0;
    
    for (let j = 0; j < partyNames.length; j++) {
      if (i & (1 << j)) {
        coalition.push(partyNames[j]);
        totalSeats += CURRENT_POLLING_SEATS[partyNames[j]] || 0;
      }
    }
    
    // Only consider coalitions with majority (76+ seats)
    if (totalSeats >= 76 && coalition.length >= 2) {
      // Check if all parties in coalition are compatible
      let allCompatible = true;
      for (let x = 0; x < coalition.length && allCompatible; x++) {
        for (let y = x + 1; y < coalition.length && allCompatible; y++) {
          if (!canCoalition(coalition[x], coalition[y])) {
            allCompatible = false;
          }
        }
      }
      
      if (allCompatible) {
        // Calculate coalition stability (inverse of ideological spread)
        let totalDistance = 0;
        let comparisons = 0;
        
        for (let x = 0; x < coalition.length; x++) {
          for (let y = x + 1; y < coalition.length; y++) {
            totalDistance += calculateIdeologicalDistance(coalition[x], coalition[y]);
            comparisons++;
          }
        }
        
        const avgDistance = comparisons > 0 ? totalDistance / comparisons : 0;
        const stability = Math.max(0, 1 - avgDistance); // Higher = more stable
        
        coalitions.push({
          parties: coalition,
          seats: totalSeats,
          stability
        });
      }
    }
  }
  
  // Sort by stability (most likely coalitions first)
  return coalitions.sort((a, b) => b.stability - a.stability);
};

export interface CoalitionChance {
  partyName: string;
  chancePercentage: number;
  mostLikelyCoalitions: Array<{
    partners: string[];
    seats: number;
    probability: number;
  }>;
  explanation: string;
}

export const calculateCoalitionChances = (
  results: PartyResult[]
): CoalitionChance[] => {
  const parties = results.map(r => r.party);
  const possibleCoalitions = generatePossibleCoalitions(parties);
  
  // Calculate total "coalition space" for normalization
  const totalCoalitionWeight = possibleCoalitions.reduce((sum, coalition) => {
    return sum + coalition.stability;
  }, 0);
  
  return parties.map(party => {
    const partyName = party.name;
    
    // Find all coalitions this party could be part of
    const partyCoalitions = possibleCoalitions.filter(coalition => 
      coalition.parties.includes(partyName)
    );
    
    if (partyCoalitions.length === 0) {
      return {
        partyName,
        chancePercentage: 0,
        mostLikelyCoalitions: [],
        explanation: `${partyName} heeft grote moeite om coalitiePartnership te vinden door ideologische incompatibiliteit met andere partijen.`
      };
    }
    
    // Calculate weighted probability based on coalition stability
    const totalPartyWeight = partyCoalitions.reduce((sum, coalition) => {
      return sum + coalition.stability;
    }, 0);
    
    const chancePercentage = totalCoalitionWeight > 0 
      ? Math.round((totalPartyWeight / totalCoalitionWeight) * 100)
      : 0;
    
    // Get top 3 most likely coalitions for this party
    const topCoalitions = partyCoalitions
      .slice(0, 3)
      .map(coalition => ({
        partners: coalition.parties.filter(p => p !== partyName),
        seats: coalition.seats,
        probability: Math.round((coalition.stability / totalPartyWeight) * 100)
      }));
    
    // Generate explanation
    let explanation = "";
    if (chancePercentage > 70) {
      explanation = `${partyName} heeft uitstekende coalitiekansen door brede compatibiliteit met andere partijen.`;
    } else if (chancePercentage > 40) {
      explanation = `${partyName} heeft goede coalitiekansen, vooral in centrum-gerichte samenwerking.`;
    } else if (chancePercentage > 15) {
      explanation = `${partyName} heeft beperkte maar reële coalitiekansen, afhankelijk van politieke ontwikkelingen.`;
    } else {
      explanation = `${partyName} heeft lage coalitiekansen door ideologische positionering of incompatibiliteit.`;
    }
    
    return {
      partyName,
      chancePercentage: Math.min(100, Math.max(0, chancePercentage)),
      mostLikelyCoalitions: topCoalitions,
      explanation
    };
  });
};