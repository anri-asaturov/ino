import './instrument.js';
import { log } from './helpers/logger.js';
import { createServer } from './server.js';
import { initializeLabResultsDataSet } from './services/labResultsImportService.js';

createServer().then(async (server) => {
  await server.start();

  // Prefill after the server is listening so a slow or unavailable
  // mock API can't block startup and health checks.
  initializeLabResultsDataSet().catch((error) => {
    log.error(error, 'Initial lab results data set import failed.');
  });
});
