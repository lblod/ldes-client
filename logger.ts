import { LOG_LEVEL } from "./environment";

import winston from "winston";

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [new winston.transports.Console()],
});
