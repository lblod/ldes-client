export default {
  endpoints: [
    {
      name: 'Stream 1',
      LDES_BASE: 'https://locally-managed/streams/ldes-1/abb/',
      FIRST_PAGE: 'https://locally-managed/streams/ldes-1/abb/1',
      TARGET_GRAPH: 'http://mu.semte.ch/graphs/locally-managed',
      STATUS_GRAPH: 'http://mu.semte.ch/graphs/locally-managed/status',
      EXTRA_HEADERS: {},
      VERSION_PREDICATE: 'http://purl.org/dc/terms/isVersionOf',
      TIME_PREDICATE: 'http://www.w3.org/ns/prov#generatedAtTime',
      NEXT_PAGE_RELATIONSHIP_RDF_TYPE:
        'https://w3id.org/tree#GreaterThanOrEqualToRelation',
    },
  ],
};
