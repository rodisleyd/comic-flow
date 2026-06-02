/**
 * Types definition for the Comic Book Script Writer
 * This defines the schema that synchronizes actions, dialogues, and captions/SFX.
 */

export interface Panel {
  id: string;
  number: number;
  action: string;      // Column 1 (Left): Visually descriptive actions
  dialogues: string;   // Column 2 (Center): Characters & Dialogues / Speeches
  captions: string;    // Column 3 (Right): Captions, recordatorios, SFX & Onomatopoeia
}

export interface Page {
  id: string;
  number: number;
  panels: Panel[];
}

export interface ComicScript {
  id: string;
  title: string;
  author: string;
  treatment?: string; // e.g., "1º Tratamento", "Final Draft", "Versão Alfa"
  description: string;
  createdAt: string;
  updatedAt: string;
  pages: Page[];
  argument?: string;
  pageCount?: number;
  beats?: { pageNumber: number; description: string }[];
  beatsSummary?: string;
}
