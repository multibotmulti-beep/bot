'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { bridge } from '../../lib/bridge/UniversalBridge';
import { BridgeAPI } from '../../lib/bridge/types';

const BridgeContext = createContext<BridgeAPI>(bridge);

export const BridgeProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
  );
};

export const useBridge = () => useContext(BridgeContext);
