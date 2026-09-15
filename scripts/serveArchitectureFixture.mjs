import { createArchitectureServer } from './architectureFixtureServer.mjs';
const server=await createArchitectureServer(5185);
await server.listen();
console.log('Local TEST ONLY fixture harness: http://127.0.0.1:5185/tests/architecture/index.html');
console.log('The normal Luna entry remains procedural. No final architecture is supplied.');
