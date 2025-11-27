import { v4 as uuid } from 'uuid';
import config, { Config } from './config/config';
import { JwtAuthArgs, setJwtAuthHeader } from './jwt';

export const RANDOMIZE_GRAPHS =
  (process.env.RANDOMIZE_GRAPHS || 'false') === 'true';
export const CRON_PATTERN = process.env.CRON_PATTERN || '*/5 * * * * *';
export const LDES_BASE = process.env.LDES_BASE;
export const FIRST_PAGE =
  process.env.FIRST_PAGE ||
  'https://dev.mandatenbeheer.lblod.info/streams/ldes/public/1';
export const WORKING_GRAPH =
  (process.env.WORKING_GRAPH || 'http://mu.semte.ch/graphs/temp') +
  (RANDOMIZE_GRAPHS ? `/${uuid()}` : '');
export const BATCH_GRAPH =
  (process.env.BATCH_GRAPH || 'http://mu.semte.ch/graphs/batch') +
  (RANDOMIZE_GRAPHS ? `/${uuid()}` : '');
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
export const EXTRA_HEADERS = new Headers(
  JSON.parse(process.env.EXTRA_HEADERS || '{}'),
);
export const BYPASS_MU_AUTH =
  (process.env.BYPASS_MU_AUTH || 'false') === 'true';
export const RUN_AT_STARTUP =
  (process.env.RUN_AT_STARTUP || 'false') === 'true';

const DEFAULT_NEXT_PAGE_RELATIONSHIP_RDF_TYPE =
  'https://w3id.org/tree#GreaterThanOrEqualToRelation';
export const NEXT_PAGE_RELATIONSHIP_RDF_TYPE =
  process.env.NEXT_PAGE_RELATIONSHIP_RDF_TYPE ||
  DEFAULT_NEXT_PAGE_RELATIONSHIP_RDF_TYPE;

export const SKOLEMIZE_BLANK_NODES =
  (process.env.SKOLEMIZE_BLANK_NODES || 'false') === 'true';

const DEFAULT_SKOLEMIZATION_BASE_URI = 'http://mu.semte.ch/bnode/';
export const SKOLEMIZATION_BASE_URI =
  process.env.SKOLEMIZATION_BASE_URI || DEFAULT_SKOLEMIZATION_BASE_URI;

export const USE_JWT_AUTH = (process.env.USE_JWT_AUTH || 'false') === 'true';

export const JWT_CONFIG = USE_JWT_AUTH
  ? ({
      clientId: process.env.JWT_CLIENT_ID,
      key: JSON.parse(process.env.JWT_KEY!),
      keyAlgorithm: process.env.JWT_KEY_ALGORITHM ?? 'RS256',
      tokenUrl: process.env.JWT_TOKEN_URL,
      tokenAudience: process.env.JWT_TOKEN_REQUEST_AUDIENCE,
      tokenExpiry: process.env.JWT_TOKEN_REQUEST_EXPIRY,
      tokenScope: process.env.JWT_TOKEN_SCOPE,
      clientAssertionType:
        process.env.JWT_CLIENT_ASSERTION_TYPE ??
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    } as JwtAuthArgs)
  : undefined;

let currentStream = 0;

export const environment = {
  CRON_PATTERN,
  WORKING_GRAPH,
  BATCH_GRAPH,
  BATCH_SIZE,
  DIRECT_DATABASE_CONNECTION,
  GRAPH_STORE_URL,
  LOG_LEVEL,
  BYPASS_MU_AUTH,
  RANDOMIZE_GRAPHS,
  // getters for the other properties so we can loop over multiple streams defined in the config
  // if LDES_BASE is set, use the environment variables and don't look at the config file, if it isn't set, use the config file
  getLdesBase() {
    if (LDES_BASE) {
      return LDES_BASE;
    }
    return config.endpoints[currentStream].LDES_BASE;
  },
  getFirstPage() {
    if (LDES_BASE) {
      return FIRST_PAGE;
    }
    return config.endpoints[currentStream].FIRST_PAGE;
  },
  getTargetGraph() {
    if (LDES_BASE) {
      return TARGET_GRAPH;
    }
    return config.endpoints[currentStream].TARGET_GRAPH;
  },
  getStatusGraph() {
    if (LDES_BASE) {
      return STATUS_GRAPH;
    }
    return config.endpoints[currentStream].STATUS_GRAPH;
  },
  async getExtraHeaders() {
    if (LDES_BASE) {
      const headers = EXTRA_HEADERS;
      if (USE_JWT_AUTH && JWT_CONFIG) {
        await setJwtAuthHeader(headers, JWT_CONFIG);
      }
      return EXTRA_HEADERS;
    } else {
      const currentConfig = config.endpoints[currentStream] as Config;
      const headers =
        typeof currentConfig.EXTRA_HEADERS === 'string'
          ? new Headers(JSON.parse(currentConfig.EXTRA_HEADERS))
          : (currentConfig.EXTRA_HEADERS ?? new Headers());
      if (currentConfig.USE_JWT_AUTH) {
        const jwtConfig: JwtAuthArgs = {
          clientId: currentConfig.JWT_CLIENT_ID,
          key:
            typeof currentConfig.JWT_KEY === 'string'
              ? JSON.parse(currentConfig.JWT_KEY)
              : currentConfig.JWT_KEY,
          keyAlgorithm: currentConfig.JWT_KEY_ALGORITHM,
          tokenUrl: currentConfig.JWT_TOKEN_URL,
          tokenAudience: currentConfig.JWT_TOKEN_REQUEST_AUDIENCE,
          tokenExpiry: currentConfig.JWT_TOKEN_REQUEST_EXPIRY,
          tokenScope: currentConfig.JWT_TOKEN_SCOPE,
          clientAssertionType: currentConfig.JWT_CLIENT_ASSERTION_TYPE,
        };
        await setJwtAuthHeader(headers, jwtConfig);
      }
      return headers;
    }
  },
  getVersionPredicate() {
    if (LDES_BASE) {
      return VERSION_PREDICATE;
    }
    return config.endpoints[currentStream].VERSION_PREDICATE;
  },
  getTimePredicate() {
    if (LDES_BASE) {
      return TIME_PREDICATE;
    }
    return config.endpoints[currentStream].TIME_PREDICATE;
  },
  getNextPageRelationshipRdfType() {
    if (LDES_BASE) {
      return NEXT_PAGE_RELATIONSHIP_RDF_TYPE;
    }
    return (
      config.endpoints[currentStream].NEXT_PAGE_RELATIONSHIP_RDF_TYPE ||
      DEFAULT_NEXT_PAGE_RELATIONSHIP_RDF_TYPE
    );
  },
  skolemnizeBlankNodes() {
    if (LDES_BASE) {
      return SKOLEMIZE_BLANK_NODES;
    }
    return config.endpoints[currentStream].SKOLEMIZE_BLANK_NODES || false;
  },
  getSkolemizationBaseUri() {
    if (LDES_BASE) {
      return SKOLEMIZATION_BASE_URI;
    }
    return (
      config.endpoints[currentStream].SKOLEMIZATION_BASE_URI ||
      DEFAULT_SKOLEMIZATION_BASE_URI
    );
  },
  getCurrentStreamConfig() {
    return config.endpoints[currentStream];
  },
  resetCurrentStream() {
    currentStream = 0;
  },
  toNextStream() {
    currentStream++;
    if (currentStream >= config.endpoints.length) {
      currentStream = 0;
    }
    return currentStream != 0;
  },
};
