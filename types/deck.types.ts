export interface DeckNarrativeAction {
  action: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface DeckNarrative {
  portfolioSummary: string;
  keyHighlights: string[];
  fundCommentaries: Array<{ fundName: string; commentary: string }>;
  allocationInsight: string;
  recommendedActions: DeckNarrativeAction[];
  closingNote: string;
}
