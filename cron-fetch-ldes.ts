import { CronJob } from 'cron';
import { logger } from './logger';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri } from 'mu';
import { URL } from 'url';
import {
  DIRECT_DATABASE_CONNECTION,
  GRAPH_STORE_URL,
  WORKING_GRAPH,
  CRON_PATTERN,
  environment,
} from './environment';
import { batchedProcessLDESPage } from './batched-page-processor';
import {
  StateInfo,
  gatherStateInfo,
  loadState,
  runningState,
  saveState,
  streamIsAlreadyUpToDate,
} from './manage-state';
import { handleStreamEnd } from './config/handleStreamEnd';
import { v4 as uuid } from 'uuid';
import dataFactory from '@rdfjs/data-model';
import { rdfParser } from 'rdf-parse';
import { rdfSerializer } from 'rdf-serialize';
import { Readable } from 'stream';
import { text } from 'stream/consumers';
import { BlankNode, NamedNode, Quad } from '@rdfjs/types';
import processTurtle from './config/processTurtle';

async function determineFirstPage(): Promise<StateInfo> {
  const state = await loadState();
  if (!state) {
    return {
      lastTime: new Date(0).toISOString(),
      lastTimeCount: 0,
      currentPage: environment.getFirstPage(),
      nextPage: null,
    };
  }
  return state;
}

async function determineNextPage() {
  const page = await querySudo(
    `SELECT ?page WHERE { GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
    ?relation a ${sparqlEscapeUri(environment.getNextPageRelationshipRdfType())} .
    ?relation <https://w3id.org/tree#node> ?page.
  } }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );

  if (page.results.bindings.length === 0) {
    return null;
  }

  return new URL(page.results.bindings[0].page.value, environment.getLdesBase())
    .href;
}

async function clearWorkingGraph() {
  await updateSudo(
    `DROP SILENT GRAPH ${sparqlEscapeUri(WORKING_GRAPH)}`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );
}

async function loadLDESPage(url: string) {
  logger.info(`Loading LDES page ${url}`);
  const extraHeaders = await environment.getExtraHeaders();
  const headers = new Headers(extraHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'text/turtle');
  }
  const response = await fetch(url, {
    headers,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch LDES page ${url}, status ${response.status}, ${await response.text()}`,
    );
  }

  logger.info(`Uploading LDES page ${url}`);
  let rawTurtle = processTurtle(await response.text());
  if (environment.skolemnizeBlankNodes()) {
    const dataset = await parseTtl(rawTurtle);
    const skolemizedDataset = skolemizeDataset(dataset);
    rawTurtle = await serializeToTtl(skolemizedDataset);
  }
  const uploadRes = await fetch(`${GRAPH_STORE_URL}?graph=${WORKING_GRAPH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/turtle',
    },
    body: rawTurtle,
  });
  if (!uploadRes.ok) {
    throw new Error(`Failed to upload LDES page ${url}`);
  }
  logger.debug(`LDES page ${url} uploaded`);
}

async function fetchLdes() {
  logger.info(
    `Fetching LDES... (${environment.getCurrentStreamConfig().name})`,
  );
  const startingState = await determineFirstPage();
  let currentPage: string | null = startingState.currentPage;
  let nothingToDo = false;
  while (currentPage) {
    await clearWorkingGraph();
    await loadLDESPage(currentPage);

    const state = await gatherStateInfo(currentPage);
    if (streamIsAlreadyUpToDate(startingState, state)) {
      logger.info('LDES is already up to date, not fetching more pages');
      nothingToDo = true;
      break;
    }
    await batchedProcessLDESPage();

    const nextPage = await determineNextPage();
    await saveState(state);
    currentPage = nextPage;
  }

  if (!nothingToDo) {
    logger.info('LDES fetched, informing hook');
    await handleStreamEnd();
  }

  logger.info('LDES fetched, clearing working graph');

  await clearWorkingGraph();

  logger.info('LDES fetched, all done!');
}

const roundRobinFetchLdes = async () => {
  let hasNextStream = true;
  environment.resetCurrentStream();
  while (hasNextStream) {
    await fetchLdes();
    hasNextStream = environment.toNextStream();
  }
};

export const safeFetchLdes = async () => {
  if (runningState.lastRun) {
    logger.debug('Another job is already running...');
    return;
  }
  runningState.lastRun = new Date();
  await roundRobinFetchLdes();
  runningState.lastRun = null;
};

export const cronjob = CronJob.from({
  cronTime: CRON_PATTERN,
  onTick: async () => {
    await safeFetchLdes();
  },
});

function skolemizeDataset(dataset: Quad[]): Quad[] {
  const blankNodeMapping: Map<BlankNode, NamedNode> = new Map();
  return dataset.map((qd) => {
    const newSubject =
      qd.subject.termType === 'BlankNode'
        ? skolemizeBlankNode(qd.subject, blankNodeMapping)
        : qd.subject;
    const newObject =
      qd.object.termType === 'BlankNode'
        ? skolemizeBlankNode(qd.object, blankNodeMapping)
        : qd.object;
    return dataFactory.quad(newSubject, qd.predicate, newObject, qd.graph);
  });
}

function skolemizeBlankNode(
  node: BlankNode,
  blankNodeMapping: Map<BlankNode, NamedNode>,
): NamedNode {
  const skolemizedNode =
    blankNodeMapping.get(node) ??
    dataFactory.namedNode(
      new URL(`/${uuid()}`, environment.getSkolemizationBaseUri()).toString(),
    );
  if (!blankNodeMapping.has(node)) {
    blankNodeMapping.set(node, skolemizedNode);
  }
  return skolemizedNode;
}

function parseTtl(ttl: string): Promise<Quad[]> {
  return new Promise((resolve, reject) => {
    const dataset: Quad[] = [];
    rdfParser
      .parse(Readable.from(ttl), {
        contentType: 'text/turtle',
        baseIRI: 'http://example.org',
      })
      .on('data', (quad) => dataset.push(quad))
      .on('error', (error) => reject(error))
      .on('end', () => resolve(dataset));
  });
}

function serializeToTtl(dataset: Quad[]) {
  return text(
    rdfSerializer.serialize(Readable.from(dataset), {
      contentType: 'text/turtle',
    }),
  );
}
