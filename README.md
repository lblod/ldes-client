# LDES client

A simple (for now?) LDES client that aims for efficiency and customizability

## Environment variables
- **CRON_PATTERN**: the cron pattern to use for the LDES client cron job. Default: */5 * * * * *
- **FIRST_PAGE**: the url of the first page to load. Default https://mandatenbeheer.lblod.info/streams/ldes/public/1
- **LDES_BASE**: the base url of the ldes feed. Default https://mandatenbeheer.lblod.info/streams/ldes/public/
- **STATUS_GRAPH**: the URI of the status graph where this client keeps its status. Default: http://mu.semte.ch/graphs/status
- **VERSION_PREDICATE**: the URI used for the predicate determining the version of the LDES members. Default: http://purl.org/dc/terms/isVersionOf
- **TIME_PREDICATE**: the URI used for the predicate determining when the LDES member was generated. Default: http://www.w3.org/ns/prov#generatedAtTime
- **WORKING_GRAPH**: the URI of the working graph where the raw information of the LDES feed is kept temporarily for processing. Default: http://mu.semte.ch/graphs/temp.
- **BATCH_GRAPH**: the URI of the graph where the raw information is moved to for batching. Batching is used because we don't want to overwhelm mu-auth with very heavy insert/delete queries. Default: http://mu.semte.ch/graphs/ldes-batch.
- **BATCH_SIZE**: the size of batches in *count of members*, the number of triples will be larger. Default: 10000
- **TARGET_GRAPH**: the URI of the graph where the processed information of the LDES feed should land. Default: http://mu.semte.ch/graphs/public.
- **DIRECT_DATABASE_CONNECTION**: the url of a direct connection to the database. Used for queries that need to be very efficient and data uploads. Default: http://virtuoso:8890/sparql
- **GRAPH_STORE_URL**: the url for doing graph store uploads. Used for efficiently uploading the files to the db. Default: http://virtuoso:8890/sparql-graph-crud
- **LOG_LEVEL**: the log level to use, either: error, warn, info, verbose, debug, or silly. Default: info
- **EXTRA_HEADERS**: extra headers added to the requests fetching the LDES pages, as a fetch compatible JSON string. Default: {}

> [!CAUTION]
> This service is under construction and is not ready to be used in a production environment
