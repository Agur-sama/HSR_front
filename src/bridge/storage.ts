import type { BridgeSchema } from './schema';
import { downloadBridgeJson, parseBridgeJson } from './io';

export interface DraftStorage {
  load(file: File): Promise<BridgeSchema>;
  save(bridge: BridgeSchema, fileName: string): void;
}

export class JsonFileDraftStorage implements DraftStorage {
  async load(file: File): Promise<BridgeSchema> {
    return parseBridgeJson(await file.text());
  }

  save(bridge: BridgeSchema, fileName: string): void {
    downloadBridgeJson(bridge, fileName);
  }
}

export const jsonFileDraftStorage = new JsonFileDraftStorage();
