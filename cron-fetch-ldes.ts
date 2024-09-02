import { uuid } from 'mu';
import { CronJob } from 'cron';
import { logger } from './logger';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { URL } from 'url';
import { DIRECT_DATABASE_CONNECTION, GRAPH_STORE_URL, LDES_BASE, WORKING_GRAPH, FIRST_PAGE, CRON_PATTERN, BYPASS_RDFLIB, EXTRA_HEADERS } from './environment';
import { batchedProcessLDESPage } from './batched-page-processor';
import { StateInfo, gatherStateInfo, loadState, runningState, saveState, streamIsAlreadyUpToDate } from './manage-state';
import { handleStreamEnd } from './config/handleStreamEnd';

const rdflib = require('rdflib');

async function determineFirstPage(): Promise<StateInfo> {
  const state = await loadState();
  if(!state){
    return {
      lastTime: new Date(0).toISOString(),
      lastTimeCount: 0,
      currentPage: FIRST_PAGE,
      nextPage: null,
    };
  }
  return state;
}

async function determineNextPage() {
  const page = await querySudo(`SELECT ?page WHERE { GRAPH <${WORKING_GRAPH}> {
    ?relation a <https://w3id.org/tree#GreaterThanOrEqualToRelation> .
    ?relation <https://w3id.org/tree#node> ?page.
  } }`);

  if(page.results.bindings.length === 0) {
    return null;
  }

  return new URL(page.results.bindings[0].page.value, LDES_BASE).href;
}

async function clearWorkingGraph() {
  await updateSudo(`DROP SILENT GRAPH <${WORKING_GRAPH}>`, {}, {sparqlEndpoint: DIRECT_DATABASE_CONNECTION});
}

async function loadLDESPage(url: string) {
  logger.info(`Loading LDES page ${url}`);

  let turtle;
  if (BYPASS_RDFLIB) {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/turtle',
        ...EXTRA_HEADERS,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch LDES page ${url}, status ${response.status}, ${await response.text()}`);
    } else {
      turtle = await response.text();
    }
  } else {
    const store = rdflib.graph();
    const fetcher = new rdflib.Fetcher(store);
    const headers = new Headers(EXTRA_HEADERS);
    await fetcher.load(url, { headers });

    const replacedIdentifiers = {};
    store.match().map((stmt) => {
      ['subject', 'predicate', 'object'].forEach((property) => {
        if (stmt[property].termType == 'BlankNode') {
          stmt[property] =
            replacedIdentifiers[stmt[property].id]
            ||= new rdflib.NamedNode(`http://blanknodes.semantic.works/${uuid()}`);
        }
      });
    });
    turtle = rdflib.serialize(new rdflib.NamedNode(url), store);
    turtle = `@base <${url}> .\n${turtle}`;
  }

  logger.info(`Uploading LDES page ${url}`);
  const uploadRes = await fetch(`${GRAPH_STORE_URL}?graph=${WORKING_GRAPH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/turtle',
      },
      body: turtle,
  });
  if(!uploadRes.ok) {
    throw new Error(`Failed to upload LDES page ${url}`);
  }
  logger.debug(`LDES page ${url} uploaded`);
}

async function fetchLdes(){
  logger.info('Fetching LDES...');
  const startingState = await determineFirstPage();
  let currentPage: string | null = startingState.currentPage;
  let nothingToDo = false;
  while(currentPage) {

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

  if(!nothingToDo){
    logger.info('LDES fetched, informing hook');
    await handleStreamEnd();
  }

  logger.info('LDES fetched, clearing working graph');

  await clearWorkingGraph();

  logger.info('LDES fetched, all done!');
}

export const cronjob = CronJob.from({
  cronTime: CRON_PATTERN,
  onTick: async () => {
    if(runningState.lastRun) {
      logger.debug('Another job is already running...');
      return;
    }
    runningState.lastRun = new Date();
    await fetchLdes();
    runningState.lastRun = null;
  },
});
