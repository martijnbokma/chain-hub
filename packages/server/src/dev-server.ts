import { startServer } from "./index.js";

await startServer({ port: 2342 });
console.log("Chain Hub dev server running at http://127.0.0.1:2342");
