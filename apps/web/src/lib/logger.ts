import pino from 'pino';

const isServer = typeof window === 'undefined';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: {
    asObject: true,
  },
  transport: isServer && process.env.NODE_ENV !== 'production' ? {
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  } : undefined,
});

export default logger;
