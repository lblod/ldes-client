import { logger } from "./logger";
import { processPage } from './config/processPage';
import { BATCH_GRAPH, BATCH_SIZE, DIRECT_DATABASE_CONNECTION, TIME_PREDICATE, VERSION_PREDICATE, WORKING_GRAPH } from "./environment";
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri } from 'mu';

async function clearBatchGraph() {
  await updateSudo(
    `DROP SILENT GRAPH <${BATCH_GRAPH}>`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );
}

async function countMembers() {
  const members = await querySudo(
    `SELECT (COUNT(?member) as ?count) WHERE {
      GRAPH <${WORKING_GRAPH}> {
        ?stream <https://w3id.org/tree#member> ?member.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true },
  );
  const count = members.results.bindings[0].count.value;
  logger.debug(`Found ${count} members`);
  return count;
}

async function moveBatchToBatchingGraph() {
  logger.debug('Moving batch to batching graph');

  await updateSudo(
    `
    DELETE {
      GRAPH <${WORKING_GRAPH}> {
        ?stream <https://w3id.org/tree#member> ?member.
        ?member ?p ?o.
      }
    }
    INSERT {
      GRAPH <${BATCH_GRAPH}> {
        ?stream <https://w3id.org/tree#member> ?member.
        ?member ?p ?o.
      }
    } WHERE {
      { SELECT ?member ?stream ?time WHERE {
        GRAPH <${WORKING_GRAPH}> {
          ?stream <https://w3id.org/tree#member> ?member.
          ?member ${sparqlEscapeUri(TIME_PREDICATE)} ?time.
        }
      } ORDER BY ?time ?member LIMIT ${BATCH_SIZE} }

      GRAPH <${WORKING_GRAPH}> {
        ?member ?p ?o.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true },
  );
  logger.debug('Batch moved to batching graph');
}

async function cleanupOldVersions(){
  logger.debug('Cleaning up old versions');
  await querySudo(`
    DELETE {
      GRAPH <${WORKING_GRAPH}> {
        ?stream <https://w3id.org/tree#member> ?oldMember.
      }
    } WHERE {
      GRAPH <${WORKING_GRAPH}> {
        ?stream <https://w3id.org/tree#member> ?oldMember.
        ?oldMember ${sparqlEscapeUri(VERSION_PREDICATE)} ?trueUri.
        ?oldMember ${sparqlEscapeUri(TIME_PREDICATE)} ?oldTime.
        ?stream <https://w3id.org/tree#member> ?newMember.
        ?newMember ${sparqlEscapeUri(VERSION_PREDICATE)} ?trueUri.
        ?newMember ${sparqlEscapeUri(TIME_PREDICATE)} ?newTime.
        FILTER (?oldTime < ?newTime)
      }
    }`, {}, { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true});
  logger.debug('Old versions cleaned up');
}

async function processPageBatch() {
  logger.debug('Running custom logic to process the current page');
  await clearBatchGraph();
  await moveBatchToBatchingGraph();
  await processPage();
  return;
}

export async function batchedProcessLDESPage() {
  logger.debug('Processing LDES page...');
  if(logger.isLevelEnabled('debug')){
    // just for logging the count before cleaning old versions
    await countMembers();
  }
  await cleanupOldVersions();
  while(await countMembers() > 0){
    await processPageBatch();
  }
  logger.debug('LDES page processed');
}
