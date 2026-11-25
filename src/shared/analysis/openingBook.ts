export function isMoveSequenceInOpeningBook(movesUci: readonly string[]): boolean {
  if (movesUci.length === 0) {
    return false;
  }

  let currentNode = OPENING_BOOK_ROOT;
  for (const uciMove of movesUci) {
    const normalizedMove = uciMove.trim().toLowerCase();
    const nextNode = currentNode.children.get(normalizedMove);
    if (!nextNode) {
      return false;
    }
    currentNode = nextNode;
  }

  return true;
}

interface OpeningBookTrieNode {
  children: Map<string, OpeningBookTrieNode>;
}

function createOpeningBookTrieNode(): OpeningBookTrieNode {
  return {
    children: new Map(),
  };
}

function buildOpeningBookTrie(): OpeningBookTrieNode {
  const root = createOpeningBookTrieNode();

  for (const line of RAW_OPENING_BOOK_LINES) {
    const tokens = line.trim().split(/\s+/);
    let currentNode = root;

    for (const uciMove of tokens) {
      const normalizedMove = uciMove.toLowerCase();
      let childNode = currentNode.children.get(normalizedMove);
      if (!childNode) {
        childNode = createOpeningBookTrieNode();
        currentNode.children.set(normalizedMove, childNode);
      }
      currentNode = childNode;
    }
  }

  return root;
}

const RAW_OPENING_BOOK_LINES: readonly string[] = [
  // Italian Game & Giuoco Piano & Evans Gambit & Two Knights
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 c1d2 b4d2 b1d2 d7d5 e4d5 f6d5",
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6 e1g1 e8g8",
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 a7a6 e1g1 d7d6",
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 e1g1 g8f6 d2d3 d7d6 c2c3 a7a6 a2a4 c8a7",
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4 c2c3 b4a5 d2d4 e5d4 e1g1",
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 c2c3 d7d6 e1g1 a7a6",
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d4 e5d4 e1g1 f6e4 f1e1 d7d5 c4d5 d8d5 b1c3",
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 c6a5 c4b5 c7c6 d5c6 b7c6 b5e2 h7h6 g5f3 e5e4",
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8e7 d2d4 d7d6 d4d5 c6b8 f1d3 g8f6 c2c4",

  // Ruy Lopez (Spanish) - Main Line, Exchange, Berlin, Open
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8 h2h3",
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8 d2d4 c8g4",
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 d2d3 b7b5 a4b3 d7d6 c2c3 e8g8",
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 d2d3 d7d6 c2c3 g7g6 e1g1 f8g7",
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6 d7c6 e1g1 f8d6 d2d4 e5d4 d1d4 f7f6",
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6 d7c6 e1g1 f7f6 d2d4 e5d4 f3d4 c6c5",
  "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4 d2d4 e4d6 b5c6 d7c6 d4e5 d6f5 d1d8 e8d8",
  "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 d2d3 f8c5 c2c3 e8g8 e1g1 d7d6",
  "e2e4 e7e5 g1f3 b8c6 f1b5 d7d6 d2d4 c8d7 b1c3 g8f6 e1g1 f8e7",
  "e2e4 e7e5 g1f3 b8c6 f1b5 f7f5 b1c3 f5e4 c3e4 g8f6 e4f6 d8f6",

  // Scotch, Four Knights, Petrov, Philidor, Vienna, King's Gambit
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 b1c3 f8b4 d4c6 b7c6 f1d3 d7d5 e4d5 c6d5",
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 f8c5 c1e3 d8f6 c2c3 g8e7 f1c4 e8g8",
  "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6 f1b5 f8b4 e1g1 e8g8 d2d3 d7d6 c1g5",
  "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6 d2d4 e5d4 f3d4 f8b4 d4c6 b7c6 f1d3 d7d5",
  "e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4 d6d5 f1d3 b8c6 e1g1 f8e7 c2c4",
  "e2e4 e7e5 g1f3 g8f6 d2d4 f6e4 f1d3 d7d5 f3e5 b8d7 e1g1 f8d6 c2c4",
  "e2e4 e7e5 g1f3 d7d6 d2d4 e5d4 d1d4 g8f6 b1c3 f8e7 c1g5 e8g8 e1c1",
  "e2e4 e7e5 g1f3 d7d6 d2d4 b8d7 f1c4 c7c6 e1g1 f8e7 b1c3 g8f6",
  "e2e4 e7e5 b1c3 g8f6 f2f4 d7d5 f4e5 f6e4 d1f3 f7f5 e5f6 e4f6",
  "e2e4 e7e5 b1c3 b8c6 g2g3 g8f6 f1g2 f8c5 g1e2 d7d6 e1g1",
  "e2e4 e7e5 f2f4 e5f4 g1f3 g7g5 h2h4 g5g4 f3e5 g8f6 d2d4 d7d6",
  "e2e4 e7e5 f2f4 d7d5 e4d5 e5f4 g1f3 g8f6 f1b5 c7c6 d5c6 b7c6",
  "e2e4 e7e5 f1c4 g8f6 d2d3 c7c6 g1f3 d7d5 c4b3 f8b4 c2c3 b4d6",

  // Sicilian Defense - Najdorf, Dragon, Classical, Scheveningen, Sveshnikov, Rossolimo, Alapin
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 c8e6 f2f3 f8e7 d1d2 e8g8",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e2 e7e5 d4b3 f8e7 e1g1 e8g8",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5 e7e6 f2f4 f8e7 d1f3 d8c7 e1c1 b8d7",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 f2f3 e7e5 d4b3 c8e6 c1e3 b8d7",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 h2h3 e7e5 d4e2 h7h5 g2g3",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6 c1e3 f8g7 f2f3 e8g8 d1d2 b8c6 f1c4 c8d7 e1c1",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e6 c1e2 f8e7 e1g1 e8g8 f2f4 b8c6",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 b8c6 c1g5 e7e6 d1d2 a7a6 e1c1 c8d7",
  "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5 d4b5 d7d6 c1g5 a7a6 b5a3 b7b5 c3d5 f8e7",
  "e2e4 c7c5 g1f3 b8c6 f1b5 g7g6 e1g1 f8g7 f1e1 e7e5 c2c3 g8e7 d2d4 c5d4 c3d4 e5d4",
  "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 a7a6 f1d3 f8c5 d4b3 c5e7 e1g1 d7d6 c2c4 g8f6",
  "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3 d8c7 c1e3 a7a6 f1e2 g8f6 e1g1",
  "e2e4 c7c5 c2c3 d7d5 e4d5 d8d5 d2d4 g8f6 g1f3 e7e6 f1e2 b8c6 e1g1 f8e7",
  "e2e4 c7c5 c2c3 g8f6 e4e5 f6d5 d2d4 c5d4 g1f3 b8c6 c3d4 d7d6 f1c4 d5b6",
  "e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 d2d3 d7d6 g1e2 e7e5 e1g1 g8e7",
  "e2e4 c7c5 d2d4 c5d4 c2c3 d4c3 b1c3 b8c6 g1f3 d7d6 f1c4 e7e6 e1g1 g8f6 d1e2 f8e7",

  // French Defense - Winawer, Classical, Rubinstein, Tarrasch, Advance, Exchange
  "e2e4 e7e6 d2d4 d7d5 b1c3 f8b4 e4e5 c7c5 a2a3 b4c3 b2c3 g8e7 d1g4 e8g8",
  "e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7 g5e7 d8e7 f2f4 e8g8 g1f3 c7c5",
  "e2e4 e7e6 d2d4 d7d5 b1c3 d5e4 c3e4 b8d7 g1f3 g8f6 e4f6 d7f6 f1d3 c7c5",
  "e2e4 e7e6 d2d4 d7d5 b1d2 c7c5 e4d5 e6d5 g1f3 g8f6 f1b5 c8d7 b5d7 b8d7 e1g1",
  "e2e4 e7e6 d2d4 d7d5 b1d2 g8f6 e4e5 f6d7 f1d3 c7c5 c2c3 b8c6 g1e2 c5d4 c3d4",
  "e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3 d8b6 a2a3 c5c4 b1d2 c8d7",
  "e2e4 e7e6 d2d4 d7d5 e4d5 e6d5 f1d3 f8d6 g1f3 g8f6 e1g1 e8g8 c1g5 c8g4",

  // Caro-Kann Defense - Classical, Advance, Exchange, Panov
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6 h2h4 h7h6 g1f3 b8d7 h4h5 g6h7 f1d3 h7d3 d1d3 e7e6",
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 b8d7 g1f3 g8f6 e4f6 d7f6 f1c4 c8f5",
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 g8f6 e4f6 e7f6 c2c3 f8d6 f1d3 e8g8 g1e2",
  "e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 g1f3 e7e6 f1e2 c6c5 c1e3 b8c6 e1g1 g8e7",
  "e2e4 c7c6 d2d4 d7d5 e4d5 c6d5 f1d3 b8c6 c2c3 g8f6 c1f4 c8g4 d1b3 d8c8",
  "e2e4 c7c6 d2d4 d7d5 e4d5 c6d5 c2c4 g8f6 b1c3 e7e6 g1f3 f8e7 c4d5 f6d5",

  // Scandinavian, Pirc, Modern, Alekhine
  "e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3 c7c6 f1c4 c8f5 c1d2 e7e6",
  "e2e4 d7d5 e4d5 d8d5 b1c3 d5d6 d2d4 g8f6 g1f3 c7c6 f1e2 c8f5",
  "e2e4 d7d5 e4d5 g8f6 d2d4 f6d5 g1f3 c8g4 f1e2 e7e6 e1g1 f8e7",
  "e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 g1f3 f8g7 f1e2 e8g8 e1g1 c7c6 a2a4",
  "e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 f2f4 f8g7 g1f3 e8g8 f1d3 b8a6",
  "e2e4 g7g6 d2d4 f8g7 b1c3 d7d6 c1e3 a7a6 d1d2 b7b5 f2f3 b8d7",
  "e2e4 g8f6 e4e5 f6d5 d2d4 d7d6 g1f3 g7g6 f1c4 d5b6 c4b3 f8g7 e1g1",

  // Queen's Gambit Declined, Slav, Accepted, Tartakower, Semi-Slav
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 h7h6 g5h4 b7b6 c4d5 f6d5 h4e7 d8e7 c3d5 e6d5 a1c1 c8e6",
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 f8e7 c1f4 e8g8 e2e3 c7c5 d4c5 e7c5 c2c3 b8c6",
  "d2d4 d7d5 c2c4 e7e6 b1c3 c7c6 g1f3 g8f6 e2e3 b8d7 f1d3 d5c4 d3c4 b7b5 c4d3 c8b7",
  "d2d4 d7d5 c2c4 e7e6 g1f3 g8f6 g2g3 f8e7 f1g2 e8g8 e1g1 d5c4 d1c2 a7a6 a2a4 c8d7 c2c4 d7c6",
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5 e2e3 e7e6 f1c4 f8b4 e1g1 e8g8",
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 e2e3 c8f5 b1c3 e7e6 f3h4 f5g6 h4g6 h7g6",
  "d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5 e1g1 a7a6 d4c5 d8d1 f1d1 f8c5",
  "d2d4 d7d5 c1f4 g8f6 e2e3 c7c5 c2c3 b8c6 b1d2 e7e6 g1f3 f8d6 f4g3 e8g8",
  "d2d4 d7d5 g1f3 g8f6 c1f4 e7e6 e2e3 c7c5 c2c3 b8c6 b1d2 f8d6 f4g3",
  "d2d4 d7d5 g1f3 g8f6 c2c4 e7e6 b1c3 c7c5 c4d5 f6d5 e2e4 d5c3 b2c3 c5d4 c3d4 f8b4 c1d2",

  // Indian Defenses - Nimzo-Indian, King's Indian, Grünfeld, Catalan, Queen's Indian, Benoni
  "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1c2 e8g8 a2a3 b4c3 c2c3 b7b6 c1g5 c8b7 f2f3 h7h6 g5h4 d7d5",
  "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5 g1f3 c7c5 e1g1 b8c6 a2a3 b4c3 b2c3",
  "d2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8a6 b2b3 f8b4 c1d2 b4e7 f1g2 c7c6 d2c3 d7d5 f3e5",
  "d2d4 g8f6 c2c4 e7e6 g1f3 f8b4 c1d2 d8e7 g2g3 b8c6 f1g2 b4d2 b1d2 d7d6 e1g1 e8g8",
  "d2d4 g8f6 c2c4 e7e6 g2g3 d7d5 f1g2 f8e7 g1f3 e8g8 e1g1 d5c4 d1c2 a7a6 a2a4 c8d7 c2c4",
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 e1g1 b8c6 d4d5 c6e7 f3e1",
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f3 e8g8 c1e3 c7c5 g1e2 b8c6 d1d2 a7a6 e1c1",
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7 g1f3 c7c5 c1e3 d8a5 d1d2",
  "d2d4 g8f6 c2c4 c7c5 d4d5 b7b5 c4b5 a7a6 b5a6 g7g6 b1c3 c8a6 g1f3 d7d6 e2e4 a6f1 e1f1",
  "d2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6 e2e4 g7g6 g1f3 f8g7 f1e2 e8g8 e1g1",
  "d2d4 g8f6 c1g5 d7d5 b1d2 c7c5 e2e3 b8c6 c2c3 e7e6 g1f3 f8e7 f1d3 e8g8",
  "d2d4 f7f5 g2g3 g8f6 f1g2 e7e6 g1f3 d7d5 e1g1 f8d6 c2c4 c7c6 b2b3 d8e7",

  // English Opening & Réti Opening
  "c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 f8b4 f1g2 e8g8 e1g1 e5e4 f3g5 b4c3 b2c3",
  "c2c4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 g1f3 e7e6 e1g1 g8e7 d2d3 e8g8",
  "c2c4 g8f6 b1c3 e7e6 g1f3 d7d5 d2d4 f8e7 c1g5 e8g8 e2e3 h7h6 g5h4 b7b6",
  "g1f3 d7d5 g2g3 g8f6 f1g2 c7c6 e1g1 c8g4 d2d3 b8d7 b1d2 e7e5 e2e4 f8d6",
  "g1f3 g8f6 c2c4 g7g6 b2b3 f8g7 c1b2 e8g8 g2g3 d7d6 f1g2 e7e5 e1g1 b8c6",
];

const OPENING_BOOK_ROOT: OpeningBookTrieNode = buildOpeningBookTrie();
