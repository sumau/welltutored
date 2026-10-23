import { logPoolErrors, pool } from "./core/db";
import app from "./app";
import { isDevelopment, listenPort } from "./core/config";
import { logger } from "./core/logger";
import { ensureSeedContent } from "./seed";

logPoolErrors(pool);

const port = listenPort();

try {
  if (isDevelopment()) {
    await ensureSeedContent();
  }
} catch (err) {
  logger.error({ err }, "Failed to prepare illustrative content");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
