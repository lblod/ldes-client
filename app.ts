import { app } from 'mu';
import express, { ErrorRequestHandler, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { cronjob, safeFetchLdes } from './cron-fetch-ldes';
import { environment, RUN_AT_STARTUP } from './environment';
import { runningState } from './manage-state';
import { logger } from './logger';

app.use(
  bodyParser.json({
    limit: '500mb',
    // @ts-expect-error The types here seem to be wrong in body-parser
    type: function (req: Request) {
      return /^application\/json/.test(req.get('content-type') as string);
    },
  }),
);

app.use(express.urlencoded({ extended: true }));

app.get('/', async (_req: Request, res: Response) => {
  res.send({ status: 'ok', lastJobStartedAt: runningState.lastRun });
});

const errorHandler: ErrorRequestHandler = function (err, _req, res, _next) {
  // custom error handler to have a default 500 error code instead of 400 as in the template
  res.status(err.status || 500);
  res.json({
    errors: [{ title: err.message, description: err.description?.join('\n') }],
  });
};

app.use(errorHandler);

logger.info(`Configuration: ${JSON.stringify(environment, null, 2)}`);
logger.info('Starting LDES client in 10 seconds...');
setTimeout(() => {
  // this wait allows you to ctrl-c if you misconfigured, but also allows you to connect a debugger
  cronjob.start();

  if (RUN_AT_STARTUP) {
    safeFetchLdes().catch((e) => {
      logger.error('Failed to fetch LDES on startup: ', e);
    });
  }
}, 10000);

