import { v4 as uuid } from 'uuid';

export const RANDOMIZE_GRAPHS =
  (process.env.RANDOMIZE_GRAPHS || 'false') === 'true';
export const CRON_PATTERN = process.env.CRON_PATTERN || '*/5 * * * * *';
export const LDES_BASE =
  process.env.LDES_BASE ||
  'https://dev.mandatenbeheer.lblod.info/streams/ldes/public/';
export const FIRST_PAGE =
  process.env.FIRST_PAGE ||
  'https://dev.mandatenbeheer.lblod.info/streams/ldes/public/1';
export const WORKING_GRAPH =
  (process.env.WORKING_GRAPH || 'http://mu.semte.ch/graphs/temp') + (RANDOMIZE_GRAPHS ? `/${uuid()}` : '');
export const BATCH_GRAPH =
  (process.env.BATCH_GRAPH || 'http://mu.semte.ch/graphs/batch') + (RANDOMIZE_GRAPHS ? `/${uuid()}` : '');
export const BATCH_SIZE = process.env.BATCH_SIZE || 1000;
export const STATUS_GRAPH =
  process.env.STATUS_GRAPH || 'http://mu.semte.ch/graphs/status';
export const TARGET_GRAPH =
  process.env.TARGET_GRAPH || 'http://mu.semte.ch/graphs/public';
export const DIRECT_DATABASE_CONNECTION =
  process.env.DIRECT_DATABASE_CONNECTION || 'http://virtuoso:8890/sparql';
export const GRAPH_STORE_URL =
  process.env.GRAPH_STORE_URL || 'http://virtuoso:8890/sparql-graph-crud';
export const VERSION_PREDICATE =
  process.env.VERSION_PREDICATE || 'http://purl.org/dc/terms/isVersionOf';
export const TIME_PREDICATE =
  process.env.TIME_PREDICATE || 'http://www.w3.org/ns/prov#generatedAtTime';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const EXTRA_HEADERS = JSON.parse(process.env.EXTRA_HEADERS || '{}');
export const BYPASS_MU_AUTH =
  (process.env.BYPASS_MU_AUTH || 'false') === 'true';

export const environment = {
  CRON_PATTERN,
  LDES_BASE,
  FIRST_PAGE,
  WORKING_GRAPH,
  BATCH_GRAPH,
  BATCH_SIZE,
  STATUS_GRAPH,
  TARGET_GRAPH,
  DIRECT_DATABASE_CONNECTION,
  GRAPH_STORE_URL,
  VERSION_PREDICATE,
  TIME_PREDICATE,
  LOG_LEVEL,
  EXTRA_HEADERS,
  BYPASS_MU_AUTH,
  RANDOMIZE_GRAPHS,
};
