import { logger } from './logger';
import { processPage } from './config/processPage';
import {
  BATCH_GRAPH,
  BATCH_SIZE,
  DIRECT_DATABASE_CONNECTION,
  environment,
  WORKING_GRAPH,
} from './environment';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri } from 'mu';

async function clearBatchGraph() {
  await updateSudo(
    `DROP SILENT GRAPH ${sparqlEscapeUri(BATCH_GRAPH)}`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION },
  );
}

// note previously these members were sorted but this just wasted a lot of time and was not necessary
// the old members were already removed in a previous step so all of these members should be independent of one another
async function selectMembersFromBatch() {
  logger.debug('Fetching members from batch');
  const result = await querySudo(
    `
    SELECT DISTINCT ?member WHERE {
      GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
        ?stream <https://w3id.org/tree#member> ?member.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true },
  );
  const orderdMembers = result.results.bindings.map(
    (binding) => binding.member.value,
  );
  logger.debug(`Found ${orderdMembers.length} members`);
  return orderdMembers;
}

async function moveBatchToBatchingGraph(batchOfMembers: string[]) {
  logger.debug('Moving batch to batching graph');
  const safeMembers = batchOfMembers
    .map((member) => sparqlEscapeUri(member))
    .join('\n');

  await updateSudo(
    `
    DELETE {
      GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
        ?stream <https://w3id.org/tree#member> ?member.
        ?member ?p ?o.
      }
    }
    INSERT {
      GRAPH ${sparqlEscapeUri(BATCH_GRAPH)} {
        ?stream <https://w3id.org/tree#member> ?member.
        ?member ?p ?o.
      }
    } WHERE {
      VALUES ?member {
        ${safeMembers}
      }

      GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
        ?stream <https://w3id.org/tree#member> ?member.
        ?member ?p ?o.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true },
  );
  logger.debug('Batch moved to batching graph');
}

async function hasMultipleVersionsOnPage() {
  // this check takes a long time, hence the check if it is necessary
  // this query looks weird. it is the fastest way i could get virtuoso to check if
  // the page contains multiple versions for the same resource
  const hasMultipleVersions = await querySudo(
    `
      SELECT ?oldMember WHERE {
       GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
         ?stream <https://w3id.org/tree#member> ?oldMember.
         ?oldMember <http://purl.org/dc/terms/isVersionOf> ?trueUri.
         FILTER EXISTS {
           ?stream <https://w3id.org/tree#member> ?newMember.
           ?newMember <http://purl.org/dc/terms/isVersionOf> ?trueUri.
           FILTER (?oldMember != ?newMember)
         }
       }
     } LIMIT  1`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true },
  );

  return hasMultipleVersions.results.bindings.length > 0;
}

async function markOldVersions() {
  const VERSION_PREDICATE = environment.getVersionPredicate();
  const TIME_PREDICATE = environment.getTimePredicate();
  await updateSudo(
    ` PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      INSERT {
        GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
          ?oldMember ext:isOldMember ext:isOldMember.
        }
      } WHERE {
        GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
          ?stream <https://w3id.org/tree#member> ?oldMember.
          ?oldMember ${sparqlEscapeUri(VERSION_PREDICATE)} ?trueUri.
          ?oldMember ${sparqlEscapeUri(TIME_PREDICATE)} ?oldTime.
          ?stream <https://w3id.org/tree#member> ?newMember.
          ?newMember ${sparqlEscapeUri(VERSION_PREDICATE)} ?trueUri.
          ?newMember ${sparqlEscapeUri(TIME_PREDICATE)} ?newTime.
          FILTER (?oldMember != ?newMember && ?oldTime < ?newTime)
        }
      }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true },
  );
}

async function cleanupOldVersions() {
  logger.debug('Cleaning up old versions');
  if (!(await hasMultipleVersionsOnPage())) {
    logger.debug('No multiple versions found on page. No cleanup needed');
    return;
  }
  // if we do this using a single delete, virtuoso sometimes goes into an infinite loop, hence the insert and then delete step
  await markOldVersions();
  await updateSudo(
    `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    DELETE {
      GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
        ?stream <https://w3id.org/tree#member> ?oldMember.
      }
    } WHERE {
      GRAPH ${sparqlEscapeUri(WORKING_GRAPH)} {
        ?stream <https://w3id.org/tree#member> ?oldMember.
        ?oldMember ext:isOldMember ext:isOldMember.
      }
    }`,
    {},
    { sparqlEndpoint: DIRECT_DATABASE_CONNECTION, mayRetry: true },
  );
  logger.debug('Old versions cleaned up');
}

async function processPageBatch(batchOfMembers: string[]) {
  logger.debug('Running custom logic to process the current page');
  await clearBatchGraph();
  await moveBatchToBatchingGraph(batchOfMembers);
  await processPage();
  return;
}

export async function batchedProcessLDESPage() {
  logger.debug('Processing LDES page...');
  await cleanupOldVersions();
  const allMembers = await selectMembersFromBatch();
  while (allMembers.length > 0) {
    const batch = allMembers.splice(0, BATCH_SIZE);
    await processPageBatch(batch);
    logger.debug(`Batch processed, ${allMembers.length} members left`);
  }
  await clearBatchGraph();
  logger.debug('LDES page processed');
}
