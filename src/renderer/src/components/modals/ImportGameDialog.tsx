import { useState } from "react";
import { AlertCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImportGameDialogProps {
  onImport: (rawContent: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isClosable?: boolean;
  hideOverlay?: boolean;
}

export function ImportGameDialog({
  onImport,
  open = true,
  onOpenChange,
  isClosable = true,
  hideOverlay = false,
}: ImportGameDialogProps) {
  const [textValue, setTextValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  const isImportDisabled = !textValue.trim();

  const handleOpenChange = (nextOpen: boolean) => {
    const isDismissAttemptWhenNotClosable = !isClosable && !nextOpen;
    if (isDismissAttemptWhenNotClosable) {
      return;
    }

    if (!nextOpen) {
      setErrorMessage(null);
    }

    onOpenChange?.(nextOpen);
  };

  const preventDismissWhenNotClosable = (event: Event) => {
    if (!isClosable) {
      event.preventDefault();
    }
  };

  const preventInitialAutoFocus = (event: Event) => {
    event.preventDefault();
  };

  const handleConfirmTextImport = () => {
    try {
      setErrorMessage(null);
      onImport(textValue);
      onOpenChange?.(false);
      setTextValue("");
      setLoadedFileName(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dados PGN ou FEN inválidos.";
      setErrorMessage(message);
    }
  };

  const handleOpenDiskFile = async () => {
    setErrorMessage(null);

    try {
      const result = await window.localfishApi.openChessFileDialog();
      if (result.canceled) {
        return;
      }

      if (result.errorMessage) {
        setErrorMessage(result.errorMessage);
        return;
      }

      if (result.content) {
        setTextValue(result.content);
        setLoadedFileName(result.fileName ?? null);
      }
    } catch {
      setErrorMessage("Falha ao abrir seletor de arquivos.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton={!isClosable}
        hideOverlay={hideOverlay}
        onOpenAutoFocus={preventInitialAutoFocus}
        onEscapeKeyDown={preventDismissWhenNotClosable}
        onPointerDownOutside={preventDismissWhenNotClosable}
        className="max-w-2xl gap-6"
      >
        <DialogHeader>
          <DialogTitle>Importar Partida</DialogTitle>
          <DialogDescription>
            Cole o texto de uma partida em formato PGN/FEN ou selecione um arquivo do computador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Formatos aceitos: <strong>.pgn</strong>, <strong>.fen</strong> ou texto colado diretamente
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs"
              onClick={handleOpenDiskFile}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Selecionar Arquivo (.pgn / .fen)
            </Button>
          </div>

          {loadedFileName && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              <span>Arquivo carregado:</span>
              <strong className="font-semibold">{loadedFileName}</strong>
            </div>
          )}

          <textarea
            value={textValue}
            onChange={(event) => {
              setTextValue(event.target.value);
              setErrorMessage(null);
            }}
            placeholder={`Exemplo PGN:\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6\n\nExemplo FEN:\nr1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3`}
            className="h-52 w-full resize-none rounded-md border border-input bg-muted/50 p-3.5 font-mono text-xs leading-relaxed text-foreground shadow-sm outline-none placeholder:text-muted-foreground"
          />

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/60 bg-destructive/20 px-3 py-2 text-xs font-medium text-destructive-foreground"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive-foreground" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isImportDisabled}
            className="h-9 px-4 text-xs font-semibold"
            onClick={handleConfirmTextImport}
          >
            Carregar no Tabuleiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
