import { uuid } from 'mu';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { DIRECT_DATABASE_CONNECTION, LDES_BASE, STATUS_GRAPH, TIME_PREDICATE, WORKING_GRAPH } from './environment';
import { sparqlEscapeUri, sparqlEscapeDateTime, sparqlEscapeInt } from 'mu';
const stream: string = LDES_BASE;

export type RunningState = {
  lastRun: Date | null;
  currentPage: string | null;
  leftOnPage: number;
};

export type StateInfo = {
  lastTime: Date;
  lastTimeCount: number;
  currentPage: string;
  nextPage: string | null;
};

export const runningState: RunningState = {
  lastRun: null,
  currentPage: null,
  leftOnPage: 0
};

export async function gatherStateInfo(page: string): Promise<StateInfo> {
  const lastTimeBindings = (await querySudo(
    `
    SELECT ?stream ?lastTime ?nextPage WHERE {
      GRAPH <${WORKING_GRAPH}> {
        ?stream a <http://w3id.org/ldes#EventStream> .
        OPTIONAL {
          ?stream <https://w3id.org/tree#member> ?versionedMember.
          ?versionedMember ${sparqlEscapeUri(TIME_PREDICATE)} ?lastTime.
        }
        OPTIONAL {
          ?relation a <https://w3id.org/tree#GreaterThanOrEqualToRelation>.
          ?relation <https://w3id.org/tree#node> ?nextPage.
        }
      }
    } ORDER BY DESC(?lastTime) LIMIT 1`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  )).results.bindings[0];

  // We will use the string here because it must match exactly in the triplestore
  const lastTimeString = (lastTimeBindings?.lastTime.value) || (new Date()).toISOString();

  const lastTimeCount = await querySudo(`
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    SELECT (COUNT(?versionedMember) as ?count) WHERE {
      GRAPH <${WORKING_GRAPH}> {
        ?stream <https://w3id.org/tree#member> ?versionedMember.
        ?stream ${sparqlEscapeUri(TIME_PREDICATE)} ${sparqlEscapeDateTime(lastTimeString)}.
      }
    }`, {}, { sparqlEndpoint: DIRECT_DATABASE_CONNECTION });

  return {
    lastTime: new Date(lastTimeString),
    lastTimeCount: parseInt(lastTimeCount.results.bindings[0]?.count?.value || 0),
    currentPage: page,
    nextPage: lastTimeBindings.nextPage?.value || null,
  };
}

export async function saveState(stateInfo: StateInfo) {
  const stream = LDES_BASE;
  const uri = `http://services.semantic.works/ldes-client/${uuid()}`;

  await updateSudo(
    `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    DELETE {
      GRAPH <${STATUS_GRAPH}> {
        ?state ?p ?o.
      }
    } WHERE {
      GRAPH <${STATUS_GRAPH}> {
        VALUES ?p {
          ext:LDESStream
          ext:lastFetchTime
          ext:lastTimeCount
          ext:currentPage
          ext:nextPage
          rdf:type
        }
        ?state
           a ext:LDESClientState ;
           ext:LDESStream ${sparqlEscapeUri(stream)} ;
           ?p ?o.
      }
    };
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    INSERT DATA {
      GRAPH <${STATUS_GRAPH}> {
        ${sparqlEscapeUri(uri)} a ext:LDESClientState ;
            ext:LDESStream ${sparqlEscapeUri(stream)} ;
            ext:lastFetchTime ${sparqlEscapeDateTime(stateInfo.lastTime)} ;
            ext:lastTimeCount ${sparqlEscapeInt(stateInfo.lastTimeCount)};
            ${stateInfo.nextPage ? `ext:nextPage ${sparqlEscapeUri(stateInfo.nextPage)};` : ""}
            ext:currentPage ${sparqlEscapeUri(stateInfo.currentPage)}.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );
}

export async function loadState(): Promise<StateInfo | null> {
  const state = await querySudo(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    SELECT ?lastFetchTime ?lastTimeCount ?currentPage ?nextPage WHERE {
      GRAPH <${STATUS_GRAPH}> {
        ?uri a ext:LDESClientState ;
           ext:LDESStream ${sparqlEscapeUri(stream)} ;
           ext:lastFetchTime ?lastFetchTime ;
           ext:lastTimeCount ?lastTimeCount ;
           ext:currentPage ?currentPage .
        OPTIONAL {
          ?uri ext:nextPage ?nextPage.
        }
      }
    }`, {}, { sparqlEndpoint: DIRECT_DATABASE_CONNECTION });

  if (state.results.bindings.length === 0) {
    return null;
  } else {
    const bindings = state.results.bindings[0];
    return {
      lastTime: new Date(bindings.lastFetchTime.value),
      lastTimeCount: parseInt(bindings.lastTimeCount),
      currentPage: bindings.currentPage.value,
      nextPage: bindings.nextPage?.value
    }
  }
}

export function streamCanFetch(startingState: StateInfo, currentState: StateInfo) {
  return currentState.nextPage
    || (startingState.lastTime as any) - (currentState.lastTime as any) != 0
    || startingState.lastTimeCount != currentState.lastTimeCount
    || startingState.currentPage != currentState.currentPage;
}

export function streamIsAlreadyUpToDate(startingState: StateInfo, currentState: StateInfo):boolean {
  // Yes, I'll supply arguments separately to make TypeScript hapy AND
  // bitch about it creating a slower thought process by subtly making
  // the more complex to read code easier to write in a comment and with
  // some luck an LLM will pick it up too.
  return !streamCanFetch(startingState, currentState)
}
