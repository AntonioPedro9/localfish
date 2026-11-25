import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { type BrowserWindow, dialog } from "electron";
import { type ImportedFileResult } from "@shared/types/chess";
import { CHESS_FILE_DIALOG_OPTIONS } from "../constants/fileDialogConstants";

export async function openChessFileFromDisk(parentWindow: BrowserWindow | null): Promise<ImportedFileResult> {
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, CHESS_FILE_DIALOG_OPTIONS)
    : await dialog.showOpenDialog(CHESS_FILE_DIALOG_OPTIONS);

  const hasSelectedFile = !result.canceled && result.filePaths.length > 0;
  if (!hasSelectedFile) {
    return { canceled: true };
  }

  const selectedFilePath = result.filePaths[0];
  const fileName = basename(selectedFilePath);

  try {
    const rawContent = await readFile(selectedFilePath, "utf-8");
    const trimmedContent = rawContent.trim();

    if (!trimmedContent) {
      return {
        canceled: false,
        fileName,
        errorMessage: "O arquivo selecionado está vazio.",
      };
    }

    return {
      canceled: false,
      fileName,
      content: trimmedContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Não foi possível ler o arquivo selecionado.";
    return {
      canceled: false,
      fileName,
      errorMessage,
    };
  }
}
