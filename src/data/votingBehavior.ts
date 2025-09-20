// Mock voting behavior data - to be replaced with real parliamentary data
import type { PartyVoteStance, VotingReference } from "@/types/dualScoring";

/**
 * Mock voting references mapping statements to actual parliamentary votes
 * In production, this would come from a database of parliamentary voting records
 */
export const mockVotingReferences: VotingReference[] = [
  {
    id: "vote_1",
    statementId: "1",
    title: "Motie verhogen minimumloon",
    date: "2024-03-15",
    kamernummer: "35570-II-14",
    link: "https://www.tweedekamer.nl/kamerstukken/moties/detail?id=2024Z04821",
    description: "Motie om het minimumloon te verhogen naar €16 per uur"
  },
  {
    id: "vote_2", 
    statementId: "2",
    title: "Wetsvoorstel klimaatwet aanscherping",
    date: "2024-02-28",
    kamernummer: "35774-A",
    link: "https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen/detail?id=35774",
    description: "Aanscherping klimaatdoelen naar 60% CO2-reductie in 2030"
  },
  {
    id: "vote_3",
    statementId: "3", 
    title: "Motie afschaffing eigen risico zorgverzekering",
    date: "2024-04-10",
    kamernummer: "35000-XVI-89",
    link: "https://www.tweedekamer.nl/kamerstukken/moties/detail?id=2024Z06234",
    description: "Motie tot afschaffing van het eigen risico in de basisverzekering"
  },
  {
    id: "vote_4",
    statementId: "4",
    title: "Wetsvoorstel woningbouw versnelling", 
    date: "2024-01-25",
    kamernummer: "35000-VII-45",
    link: "https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen/detail?id=35882",
    description: "Wet om woningbouwprocedures te versnellen en doelstellingen te verhogen"
  },
  {
    id: "vote_5",
    statementId: "5",
    title: "Motie strengere migratie-eisen",
    date: "2024-05-12", 
    kamernummer: "19637-2156",
    link: "https://www.tweedekamer.nl/kamerstukken/moties/detail?id=2024Z07891",
    description: "Motie voor strengere eisen aan gezinshereniging en arbeidsmigratie"
  }
];

/**
 * Mock voting behavior data per party
 * In production, this would be calculated from actual voting records
 */
export const mockPartyVotingBehavior: Record<string, PartyVoteStance[]> = {
  "VVD": [
    { statementId: "1", pos: -1, evidenceRefs: ["vote_1"] }, // Against minimum wage increase
    { statementId: "2", pos: 0, evidenceRefs: ["vote_2"] },  // Abstained on climate law
    { statementId: "3", pos: -1, evidenceRefs: ["vote_3"] }, // Against removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 1, evidenceRefs: ["vote_5"] },  // For stricter migration
  ],
  
  "GroenLinks-PvdA": [
    { statementId: "1", pos: 1, evidenceRefs: ["vote_1"] },  // For minimum wage increase
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: 1, evidenceRefs: ["vote_3"] },  // For removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: -1, evidenceRefs: ["vote_5"] }, // Against stricter migration
  ],
  
  "PVV": [
    { statementId: "1", pos: 0, evidenceRefs: ["vote_1"] },  // Abstained on minimum wage
    { statementId: "2", pos: -1, evidenceRefs: ["vote_2"] }, // Against climate law
    { statementId: "3", pos: 1, evidenceRefs: ["vote_3"] },  // For removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 1, evidenceRefs: ["vote_5"] },  // For stricter migration
  ],
  
  "D66": [
    { statementId: "1", pos: 1, evidenceRefs: ["vote_1"] },  // For minimum wage increase
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: 0, evidenceRefs: ["vote_3"] },  // Abstained on deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: -1, evidenceRefs: ["vote_5"] }, // Against stricter migration
  ],
  
  "CDA": [
    { statementId: "1", pos: 0, evidenceRefs: ["vote_1"] },  // Abstained on minimum wage
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: -1, evidenceRefs: ["vote_3"] }, // Against removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 0, evidenceRefs: ["vote_5"] },  // Abstained on migration
  ],
  
  "ChristenUnie": [
    { statementId: "1", pos: 1, evidenceRefs: ["vote_1"] },  // For minimum wage increase
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: 0, evidenceRefs: ["vote_3"] },  // Abstained on deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 0, evidenceRefs: ["vote_5"] },  // Abstained on migration
  ],
  
  "Volt": [
    { statementId: "1", pos: 1, evidenceRefs: ["vote_1"] },  // For minimum wage increase
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: 1, evidenceRefs: ["vote_3"] },  // For removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: -1, evidenceRefs: ["vote_5"] }, // Against stricter migration
  ],
  
  "SP": [
    { statementId: "1", pos: 1, evidenceRefs: ["vote_1"] },  // For minimum wage increase
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: 1, evidenceRefs: ["vote_3"] },  // For removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: -1, evidenceRefs: ["vote_5"] }, // Against stricter migration
  ],
  
  "Partij voor de Dieren": [
    { statementId: "1", pos: 1, evidenceRefs: ["vote_1"] },  // For minimum wage increase
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: 1, evidenceRefs: ["vote_3"] },  // For removing deductible
    { statementId: "4", pos: 0, evidenceRefs: ["vote_4"] },  // Abstained on housing (environmental concerns)
    { statementId: "5", pos: -1, evidenceRefs: ["vote_5"] }, // Against stricter migration
  ],
  
  "NSC": [
    { statementId: "1", pos: 0, evidenceRefs: ["vote_1"] },  // Abstained on minimum wage
    { statementId: "2", pos: 1, evidenceRefs: ["vote_2"] },  // For climate law
    { statementId: "3", pos: 0, evidenceRefs: ["vote_3"] },  // Abstained on deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 0, evidenceRefs: ["vote_5"] },  // Abstained on migration
  ],
  
  "BBB": [
    { statementId: "1", pos: -1, evidenceRefs: ["vote_1"] }, // Against minimum wage increase (business concerns)
    { statementId: "2", pos: -1, evidenceRefs: ["vote_2"] }, // Against climate law (farming impact)
    { statementId: "3", pos: 0, evidenceRefs: ["vote_3"] },  // Abstained on deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction (rural areas)
    { statementId: "5", pos: 1, evidenceRefs: ["vote_5"] },  // For stricter migration
  ],
  
  "FvD": [
    { statementId: "1", pos: 0, evidenceRefs: ["vote_1"] },  // Abstained on minimum wage
    { statementId: "2", pos: -1, evidenceRefs: ["vote_2"] }, // Against climate law
    { statementId: "3", pos: 1, evidenceRefs: ["vote_3"] },  // For removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 1, evidenceRefs: ["vote_5"] },  // For stricter migration
  ],
  
  "JA21": [
    { statementId: "1", pos: -1, evidenceRefs: ["vote_1"] }, // Against minimum wage increase
    { statementId: "2", pos: -1, evidenceRefs: ["vote_2"] }, // Against climate law
    { statementId: "3", pos: 0, evidenceRefs: ["vote_3"] },  // Abstained on deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 1, evidenceRefs: ["vote_5"] },  // For stricter migration
  ],
  
  "BVNL": [
    { statementId: "1", pos: -1, evidenceRefs: ["vote_1"] }, // Against minimum wage increase
    { statementId: "2", pos: -1, evidenceRefs: ["vote_2"] }, // Against climate law
    { statementId: "3", pos: 1, evidenceRefs: ["vote_3"] },  // For removing deductible
    { statementId: "4", pos: 1, evidenceRefs: ["vote_4"] },  // For housing construction
    { statementId: "5", pos: 1, evidenceRefs: ["vote_5"] },  // For stricter migration
  ]
};

/**
 * Get voting behavior for a specific party
 */
export function getPartyVotingBehavior(partyName: string): PartyVoteStance[] {
  return mockPartyVotingBehavior[partyName] || [];
}

/**
 * Get voting reference by ID
 */
export function getVotingReference(referenceId: string): VotingReference | undefined {
  return mockVotingReferences.find(ref => ref.id === referenceId);
}