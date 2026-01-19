import { LOG_LEVEL, NODE_ENV } from './environment';

import winston from 'winston';

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      forceConsole: NODE_ENV === 'development',
    }),
  ],
});
