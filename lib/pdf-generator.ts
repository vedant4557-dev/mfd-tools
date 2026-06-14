import type { CASParsedData } from "@/types/cas.types";
import type { DeckNarrative } from "@/types/deck.types";
import type { Brand, Client } from "@prisma/client";

export interface GeneratePDFInput {
  casData: CASParsedData;
  narrative: DeckNarrative;
  client: Client;
  brand: Brand | null;
}

/** Puppeteer HTML→PDF implementation — Phase 2 generate feature */
export async function generatePDF(input: GeneratePDFInput): Promise<Buffer> {
  void input;
  throw new Error("PDF generation not implemented yet");
}
