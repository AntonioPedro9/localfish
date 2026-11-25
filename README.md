# Localfish ♟️🐟

Aplicação desktop desenvolvida com Electron para importação, visualização e revisão de partidas de xadrez com análise da engine **Stockfish** executada localmente.

---

## 🏁 Como rodar o projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 20 ou superior recomendada)
- Gerenciador de pacotes `npm` (ou `pnpm` / `yarn`)

### Passo a Passo

1. **Clonar o repositório:**

   ```bash
   git clone https://github.com/antoniopedro/localfish.git
   cd localfish
   ```

2. **Instalar as dependências:**

   ```bash
   npm install
   ```

3. **Iniciar em modo de desenvolvimento:**

   ```bash
   npm run dev
   ```

---

## 📜 Principais Comandos

| Comando                      | Descrição                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                | Baixa o binário do Stockfish (caso ainda não esteja presente) e inicia a aplicação em modo de desenvolvimento com hot-reload.                                      |
| `npm run build`              | Compila o código TypeScript dos processos main, preload e renderer usando Vite.                                                                                    |
| `npm run build:app`          | Prepara o executável e empacota o instalador de produção na pasta `dist/` usando o Electron Builder.                                                               |
| `npm run download:stockfish` | Script utilitário para baixar manualmente as releases oficiais do Stockfish via GitHub. Aceita parâmetros como `--platform=current`, `--platform=all` e `--force`. |
| `npm run test`               | Executa a suíte de testes unitários com o [Vitest](https://vitest.dev/).                                                                                           |
| `npm run typecheck`          | Executa a verificação estática de tipos TypeScript (`tsc --noEmit`) sem gerar arquivos de saída.                                                                   |
| `npm run format`             | Formata todos os arquivos do projeto de acordo com o padrão configurado no Prettier.                                                                               |

---

## 📦 Bibliotecas Principais e Licenças

Este projeto integra bibliotecas fundamentais do ecossistema de xadrez de código aberto:

| Biblioteca                                                       | Papel no Projeto                                                                                                                                          | Licença Oficial                                                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **[Stockfish](https://github.com/official-stockfish/Stockfish)** | Motor de xadrez executado localmente em processo separado para avaliação posicional e cálculo das melhores linhas táticas.                                | [GPL-3.0 License](https://github.com/official-stockfish/Stockfish/blob/master/Copying.txt) |
| **[Chessground](https://github.com/lichess-org/chessground)**    | Biblioteca de tabuleiro de xadrez interativo desenvolvida pelo Lichess, responsável pela interface visual, animação fluida e movimentação das peças.      | [GPL-3.0-or-later License](https://github.com/lichess-org/chessground/blob/master/LICENSE) |
| **[chess.js](https://github.com/jhlywa/chess.js)**               | Biblioteca JavaScript para validação de regras do xadrez, geração de lances válidos, verificação de xeque/mate/empates e manipulação de formatos FEN/PGN. | [BSD-2-Clause License](https://github.com/jhlywa/chess.js/blob/master/LICENSE)             |

---

## 📄 Licença

Este software é distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.
