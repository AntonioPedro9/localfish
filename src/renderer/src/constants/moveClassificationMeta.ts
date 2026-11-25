import { type MoveClassification } from "@shared/types/chess";

export interface MoveClassificationPresentation {
  label: string;
  description: string;
  textClassName: string;
  hexColor: string;
  arrowBrush: "green" | "blue" | "yellow" | "red";
  boardHighlightColor: string;
}

export const DEFAULT_BOARD_LAST_MOVE_COLOR = "rgba(180, 220, 85, 0.45)";

export const MOVE_CLASSIFICATION_META: Record<MoveClassification, MoveClassificationPresentation> = {
  brilliant: {
    label: "Brilhante",
    description: "Recurso tático ou sacrifício extraordinário.",
    textClassName: "text-[#26c2a3]",
    hexColor: "#26c2a3",
    arrowBrush: "green",
    boardHighlightColor: "rgba(38, 194, 163, 0.45)",
  },
  great: {
    label: "Excelente",
    description: "Lance crítico que encontra a única boa continuação.",
    textClassName: "text-[#749bbf]",
    hexColor: "#749bbf",
    arrowBrush: "blue",
    boardHighlightColor: "rgba(116, 155, 191, 0.45)",
  },
  book: {
    label: "Livro",
    description: "Lance padrão de abertura da teoria de xadrez.",
    textClassName: "text-[#d5a47d]",
    hexColor: "#d5a47d",
    arrowBrush: "blue",
    boardHighlightColor: "rgba(213, 164, 125, 0.45)",
  },
  best: {
    label: "Melhor",
    description: "O lance número 1 calculado pelo Stockfish.",
    textClassName: "text-[#81b64c]",
    hexColor: "#81b64c",
    arrowBrush: "green",
    boardHighlightColor: "rgba(129, 182, 76, 0.45)",
  },
  excellent: {
    label: "Ótimo",
    description: "Lance fortíssimo com perda mínima de avaliação.",
    textClassName: "text-[#81b64c]",
    hexColor: "#81b64c",
    arrowBrush: "green",
    boardHighlightColor: "rgba(129, 182, 76, 0.45)",
  },
  good: {
    label: "Bom",
    description: "Lance sólido que mantém o equilíbrio da posição.",
    textClassName: "text-[#95b776]",
    hexColor: "#95b776",
    arrowBrush: "blue",
    boardHighlightColor: "rgba(149, 183, 118, 0.45)",
  },
  inaccuracy: {
    label: "Imprecisão",
    description: "Pequeno deslize que cede iniciativa ou vantagem leve.",
    textClassName: "text-[#f7c631]",
    hexColor: "#f7c631",
    arrowBrush: "yellow",
    boardHighlightColor: "rgba(247, 198, 49, 0.45)",
  },
  mistake: {
    label: "Erro",
    description: "Lance ruim que compromete significativamente a avaliação.",
    textClassName: "text-[#ffa459]",
    hexColor: "#ffa459",
    arrowBrush: "yellow",
    boardHighlightColor: "rgba(255, 164, 89, 0.45)",
  },
  miss: {
    label: "Chance Perdida",
    description: "Deixou passar uma chance clara de vitória ou tática decisiva.",
    textClassName: "text-[#ff7769]",
    hexColor: "#ff7769",
    arrowBrush: "red",
    boardHighlightColor: "rgba(255, 119, 105, 0.45)",
  },
  blunder: {
    label: "Capivarada",
    description: "Capivarada que entrega material decisivo ou a vitória.",
    textClassName: "text-[#fa412d]",
    hexColor: "#fa412d",
    arrowBrush: "red",
    boardHighlightColor: "rgba(250, 65, 45, 0.45)",
  },
};

export const HIGHLIGHTED_CHART_CLASSIFICATIONS = new Set<MoveClassification>([
  "brilliant",
  "great",
  "blunder",
  "miss",
  "mistake",
  "inaccuracy",
]);

export const SUBOPTIMAL_MOVE_CLASSIFICATIONS = new Set<MoveClassification>([
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
]);
