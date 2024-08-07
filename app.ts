import { app } from 'mu';
import express, { Request, ErrorRequestHandler } from 'express';
import bodyParser from 'body-parser';
import { cronjob, state } from './cron-fetch-ldes';
import { logger } from './logger';
import { environment } from './environment';


app.use(
  bodyParser.json({
    limit: '500mb',
    type: function (req: Request) {
      return /^application\/json/.test(req.get('content-type') as string);
    },
  }),
);

app.use(express.urlencoded({ extended: true }));

app.get('/', async (_req, res) => {
  res.send({ status: 'ok', lastJobStartedAt: state.lastRun });
});


const errorHandler: ErrorRequestHandler = function (err, _req, res, _next) {
  // custom error handler to have a default 500 error code instead of 400 as in the template
  res.status(err.status || 500);
  res.json({
    errors: [{ title: err.message, description: err.description?.join('\n') }],
  });
};

app.use(errorHandler);

console.log(`Configuration: ${JSON.stringify(environment, null, 2)}`)
console.log('\n\nStarting LDES client cronjob in 10 seconds...\n\n');
setTimeout(() => {
  // this wait allows you to ctrl-c if you misconfigured, but also allows you to connect a debugger
  cronjob.start();
}, 10000);
