import './instrument.js';
import { createServer } from './server.js';

createServer().then((server) => {
  server.start();
});
