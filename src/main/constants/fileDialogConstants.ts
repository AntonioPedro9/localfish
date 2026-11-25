import { type OpenDialogOptions } from "electron";

export const CHESS_FILE_DIALOG_OPTIONS: OpenDialogOptions = {
  title: "Importar Partida ou Posição (PGN / FEN)",
  properties: ["openFile"],
  filters: [
    {
      name: "Arquivos de Xadrez (PGN, FEN)",
      extensions: ["pgn", "fen", "txt"],
    },
    { name: "Todos os Arquivos", extensions: ["*"] },
  ],
};
