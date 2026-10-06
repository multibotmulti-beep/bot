import { BridgeAPI, Capability } from './types';

export abstract class BaseAdapter implements BridgeAPI {
  abstract readonly capabilities: Capability[];

  isAvailable(capability: Capability): boolean {
    return this.capabilities.includes(capability);
  }

  abstract request(cmd: string, params: any): Promise<any>;
  abstract subscribe(
    eventName: string,
    callback: (data: any) => void
  ): () => void;
}
