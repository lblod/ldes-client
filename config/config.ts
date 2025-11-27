import type { JWK } from 'jose';

export type Config = {
  name: string;
  LDES_BASE: string;
  FIRST_PAGE: string;
  TARGET_GRAPH: string;
  STATUS_GRAPH: string;
  EXTRA_HEADERS?: Headers | string;
  VERSION_PREDICATE: string;
  TIME_PREDICATE: string;
  NEXT_PAGE_RELATIONSHIP_RDF_TYPE?: string;
  SKOLEMIZE_BLANK_NODES?: boolean;
  SKOLEMIZATION_BASE_URI?: string;
} & (
  | {
      USE_JWT_AUTH: true;
      JWT_CLIENT_ID: string;
      JWT_KEY: string | JWK;
      JWT_KEY_ALGORITHM: string;
      JWT_TOKEN_URL: string;
      JWT_TOKEN_REQUEST_AUDIENCE: string;
      JWT_TOKEN_REQUEST_EXPIRY: string;
      JWT_TOKEN_SCOPE: string;
      JWT_CLIENT_ASSERTION_TYPE: string;
    }
  | {
      USE_JWT_AUTH?: false;
    }
);

export default {
  endpoints: [
    {
      name: 'Stream 1',
      LDES_BASE: 'https://locally-managed/streams/ldes-1/abb/',
      FIRST_PAGE: 'https://locally-managed/streams/ldes-1/abb/1',
      TARGET_GRAPH: 'http://mu.semte.ch/graphs/locally-managed',
      STATUS_GRAPH: 'http://mu.semte.ch/graphs/locally-managed/status',
      EXTRA_HEADERS: new Headers(),
      VERSION_PREDICATE: 'http://purl.org/dc/terms/isVersionOf',
      TIME_PREDICATE: 'http://www.w3.org/ns/prov#generatedAtTime',
      NEXT_PAGE_RELATIONSHIP_RDF_TYPE:
        'https://w3id.org/tree#GreaterThanOrEqualToRelation',
      SKOLEMIZE_BLANK_NODES: false,
      SKOLEMIZATION_BASE_URI: 'http://mu.semte.ch/bnode/',
    },
  ] satisfies Config[],
};
