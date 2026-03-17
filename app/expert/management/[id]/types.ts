// Kanban types are in @/lib/expert/cases (CaseCard, KanbanColumn).

// Grant Registration Types
export interface Step {
  id: number;
  stepName: string;
  subtitle: string;
  description: string;
  estimatedDays: number;
}
