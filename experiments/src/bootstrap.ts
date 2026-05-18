// Loads server/.env with an absolute path so the experiment scripts work no
// matter where they're invoked from (npm --prefix server, plain ts-node, etc).
// Must be imported FIRST in any entry point — dotenv has to populate
// process.env before any module that constructs an SDK client is loaded.

import * as path from "path";
import { config } from "dotenv";

const envPath = path.resolve(__dirname, "..", "..", ".env");
config({ path: envPath, override: true });
