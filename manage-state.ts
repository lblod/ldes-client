import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import {
  DIRECT_DATABASE_CONNECTION,
  environment,
  WORKING_GRAPH,
} from './environment';
import { sparqlEscapeUri, sparqlEscapeDateTime, sparqlEscapeString } from 'mu';
import { v4 as uuid } from 'uuid';

export type RunningState = {
  lastRun: Date | null;
  currentPage: string | null;
  leftOnPage: number;
  retries: number;
};

export type StateInfo = {
  lastTime: string;
  lastTimeCount: number;
  currentPage: string;
  nextPage: string | null;
};

export const runningState: RunningState = {
  lastRun: null,
  currentPage: null,
  leftOnPage: 0,
  retries: 0,
};

export async function gatherStateInfo(currentPage: string): Promise<StateInfo> {
  const lastTime = await querySudo(
    // We query both using the `http` and `https` version of the `ldes` namespace.
    // The `https` one is the correct one, but our internal feeds use the incorrect `http` one.
    /* sparql */ `
    SELECT ?stream ?lastTime ?nextPage WHERE {
      GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
        {
          ?stream a <http://w3id.org/ldes#EventStream> .
        }
        UNION
        {
          ?stream a <https://w3id.org/ldes#EventStream> .
        }
        OPTIONAL {
          ?stream <https://w3id.org/tree#member> ?versionedMember.
          ?versionedMember ${sparqlEscapeUri(environment.getTimePredicate())} ?lastTime.
        }
        OPTIONAL {
          ?relation a ${sparqlEscapeUri(environment.getNextPageRelationshipRdfType())}.
          ?relation <https://w3id.org/tree#node> ?nextPage.
        }
      }
    } ORDER BY DESC(?lastTime) LIMIT 1`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );

  const lastTimeValue =
    lastTime.results.bindings[0]?.lastTime?.value || new Date(0).toISOString();

  const lastTimeCount = await querySudo(
    `
    SELECT (COUNT(?versionedMember) as ?count) WHERE {
      GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
        ?stream <https://w3id.org/tree#member> ?versionedMember.
        ?stream ${sparqlEscapeUri(environment.getTimePredicate())} ${sparqlEscapeDateTime(lastTimeValue)}.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );

  return {
    lastTime: lastTimeValue,
    lastTimeCount: lastTimeCount.results.bindings[0]?.count?.value || 0,
    currentPage,
    nextPage: lastTime.results.bindings[0]?.nextPage?.value || null,
  };
}

export async function saveState(stateInfo: StateInfo) {
  const stream = environment.getLdesBase();
  const uri = `ext:ldes-state-${uuid()}`;
  await updateSudo(
    `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      GRAPH ${sparqlEscapeUri(environment.getStatusGraph())} {
        ?s ?p ?o.
      }
    } WHERE {
      GRAPH ${sparqlEscapeUri(environment.getStatusGraph())} {
        ?s a ext:LDESClientState ;
           ext:LDESStream ${sparqlEscapeUri(stream)} ;
           ?p ?o.
      }
    };
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    INSERT DATA {
      GRAPH ${sparqlEscapeUri(environment.getStatusGraph())} {
        ${uri} a ext:LDESClientState ;
            ext:LDESStream ${sparqlEscapeUri(stream)} ;
            ext:LDESState ${sparqlEscapeString(JSON.stringify(stateInfo))} .
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );
}

export async function loadState(): Promise<StateInfo | null> {
  const stream = environment.getLdesBase();
  const state = await querySudo(
    `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    SELECT ?state WHERE {
      GRAPH ${sparqlEscapeUri(environment.getStatusGraph())} {
        ?s a ext:LDESClientState ;
            ext:LDESStream ${sparqlEscapeUri(stream)} ;
            ext:LDESState ?state.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );

  if (state.results.bindings.length === 0) {
    return null;
  }

  return JSON.parse(state.results.bindings[0]?.state?.value);
}

export function streamIsAlreadyUpToDate(
  startingState: StateInfo,
  currentState: StateInfo,
) {
  return (
    !currentState.nextPage &&
    startingState.lastTime === currentState.lastTime &&
    startingState.lastTimeCount === currentState.lastTimeCount &&
    startingState.currentPage === currentState.currentPage
  );
}
