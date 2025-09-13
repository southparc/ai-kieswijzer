// This file is now deprecated - parties are loaded dynamically from the database
// Use the useParties hook instead

import { Party } from "@/types/party";

// Legacy export for backward compatibility - will be empty
export const parties: Party[] = [];

// Re-export types for backward compatibility
export type { Party } from "@/types/party";