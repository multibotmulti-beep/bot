import { isLauncher } from '../environment/detector';
import { BridgeAPI } from './types';
import { BrowserAdapter } from './adapters/BrowserAdapter';
import { ElectronAdapter } from './adapters/ElectronAdapter';

const getAdapter = (): BridgeAPI => {
  if (isLauncher()) {
    return new ElectronAdapter();
  }
  return new BrowserAdapter();
};

export const bridge = getAdapter();
