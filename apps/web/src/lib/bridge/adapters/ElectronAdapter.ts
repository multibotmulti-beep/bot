import { BaseAdapter } from '../BaseAdapter';
import { Capability } from '../types';

declare global {
  interface Window {
    bridge: any;
  }
}

export class ElectronAdapter extends BaseAdapter {
  readonly capabilities: Capability[] = [
    'scanner-usb',
    'native-window',
    'event-queue',
    'file-system',
  ];

  get fs() {
    return window.bridge.fs;
  }

  async request(cmd: string, params: any): Promise<any> {
    return await window.bridge.request(cmd, params);
  }

  subscribe(eventName: string, callback: (data: any) => void): () => void {
    return window.bridge.subscribe(eventName, callback);
  }
}
