export type Capability =
  | 'scanner-usb'
  | 'native-window'
  | 'event-queue'
  | 'file-system';

export interface BridgeAPI {
  readonly capabilities: Capability[];
  isAvailable(capability: Capability): boolean;
  request(cmd: string, params: any): Promise<any>;
  subscribe(eventName: string, callback: (data: any) => void): () => void;
  // Acceso opcional al filesystem
  fs?: {
    writeFile: (folder: string, filename: string, data: string) => Promise<any>;
    readFile: (folder: string, filename: string) => Promise<any>;
  };
}
