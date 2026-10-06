import { BaseAdapter } from '../BaseAdapter';
import { Capability } from '../types';

export class BrowserAdapter extends BaseAdapter {
  readonly capabilities: Capability[] = [];

  async request(cmd: string, params: any): Promise<any> {
    console.warn('[Bridge] BrowserAdapter: No native capability for', cmd);
    return { success: false, message: 'Capability not supported' };
  }

  subscribe(eventName: string, callback: (data: any) => void): () => void {
    console.warn('[Bridge] BrowserAdapter: Subscription not supported');
    return () => {};
  }
}
