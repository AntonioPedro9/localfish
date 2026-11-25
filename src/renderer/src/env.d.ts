/// <reference types="vite/client" />

import { type LocalfishApi } from "@shared/types/chess";

declare global {
  interface Window {
    localfishApi: LocalfishApi;
  }
}
