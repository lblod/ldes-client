# LDES client

A simple (for now?) LDES client that aims for efficiency and customizability

## Setting up
Add this image to your docker compose file and use the environemnt variables to configure which LDES stream you want to follow.

The LDES stream will be read per page, but every page will be batched (to not overwhelm mu-authorization if you use that). Each page will be loaded into the `WORKING_GRAPH` graph in virtuoso using a direct virtuoso connection (no deltas).

Then a batch of `BATCH_SIZE` members of the stream (members, not triples so the members are complete) will be loaded into the `BATCH_GRAPH`, again using a direct virtuoso connection.

At this point, the members in the `BATCH_GRAPH` are processed using the `processPage` function in the config directory. A default implementation of this function is provided, which simply removes from the `TARGET_GRAPH` all triples where the true uri of a versioned member is the subject and replaces them with the information in the LDES. Triples where the predicate is pointing toward the subject are not touched here by default (and if you would want this, you'd have to extend the way batches are built because only triples pointing from the member are considered right now!).

## State management
This client keeps track of which pages it already processed using the `STATUS_GRAPH`. In this graph, it tracks:
- the last `TIME_PREDICATE` value of a member it saw
- how many members had that time when it last checked
- the page it is currently on
- the next page it was supposed to fetch if any

This information is kept in a new uri with type `ext:LDESClientSTate` that points to the `LDES_BASE` uri using the `ext:LDESStream` predicate and keeps the state as JSON in `ext:LDESState`.

The client periodically (`CRON_PATTERN`) runs a cronjob that checks the state and continues from where it left off. If the same last time and member count is on the last page, it doesn't process it again. Otherwise, it reloads the entire page.

## Secure LDES streams
An environment variable `EXTRA_HEADERS` is provided so you can use basic auth when fetching LDES pages.

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
