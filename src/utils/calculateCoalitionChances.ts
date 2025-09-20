import { PartyResult } from "@/types/party";

export interface CoalitionOption {
  partners: string[];
  seats: number;
  probability: number;
}

export interface CoalitionChance {
  partyName: string;
  chancePercentage: number;
  explanation: string;
  mostLikelyCoalitions: CoalitionOption[];
}

export function calculateCoalitionChances(results: PartyResult[]): CoalitionChance[] {
  return results.map((result) => {
    // Calculate coalition chances based on party performance and traditional coalition patterns
    const baseChance = Math.min(95, Math.max(5, result.percentage));
    
    // Adjust based on party size and traditional coalition behavior
    const sizeMultiplier = result.percentage > 20 ? 1.2 : 
                          result.percentage > 10 ? 1.0 : 0.8;
    
    const finalChance = Math.round(baseChance * sizeMultiplier);
    
    // Generate realistic coalition options
    const coalitionOptions: CoalitionOption[] = [];
    
    // Find potential partners (parties with >5% that aren't the current party)
    const potentialPartners = results
      .filter(r => r.party.name !== result.party.name && r.percentage > 5)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
    
    potentialPartners.forEach((partner, index) => {
      const combinedSeats = Math.round((result.percentage + partner.percentage) * 1.5);
      const probability = Math.max(10, 80 - (index * 20));
      
      if (combinedSeats >= 76) { // Majority threshold
        coalitionOptions.push({
          partners: [partner.party.name],
          seats: combinedSeats,
          probability
        });
      }
    });
    
    // Generate explanation based on party performance
    let explanation = "";
    if (finalChance >= 80) {
      explanation = "Zeer hoge kans op regeringsdeelname door sterke verkiezingsuitslag en brede coalitiemogelijkheden.";
    } else if (finalChance >= 60) {
      explanation = "Goede kans op regeringsdeelname, afhankelijk van coalitieonderhandelingen.";
    } else if (finalChance >= 40) {
      explanation = "Gemiddelde kans op regeringsdeelname, mogelijk als junior partner in coalitie.";
    } else if (finalChance >= 20) {
      explanation = "Beperkte kans op regeringsdeelname, waarschijnlijk oppositierol.";
    } else {
      explanation = "Zeer kleine kans op regeringsdeelname, waarschijnlijk oppositierol.";
    }
    
    return {
      partyName: result.party.name,
      chancePercentage: finalChance,
      explanation,
      mostLikelyCoalitions: coalitionOptions
    };
  });
}