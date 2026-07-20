const express = require("express");
const cors = require("cors");
const { NotesLedger } = require("./application/notes-ledger");
const {
  createErrorHandler,
  notFoundHandler,
} = require("./http/middleware/error-handler");
const { createNotesRouter } = require("./http/routes/notes-routes");
const { BlockfrostClient } = require("./services/blockfrost/blockfrost-client");
const { logger } = require("./services/logging/logger");
const { createNotesRepository } = require("./services/persistence/notes-repository");

function createNotesLedger(options = {}) {
  return new NotesLedger({
    client: options.client || new BlockfrostClient(options.config),
    repository:
      options.repository || createNotesRepository(options.repositoryOptions),
    logger: options.logger || logger,
  });
}

function createApp(options = {}) {
  const app = express();
  const notesLedger = options.notesLedger || createNotesLedger(options.ledgerOptions);

  app.use(cors());
  app.use(express.json());
  app.use("/api", createNotesRouter(notesLedger));
  app.use(notFoundHandler);
  app.use(createErrorHandler(notesLedger));

  return {
    app,
    notesLedger,
  };
}

module.exports = {
  createApp,
  createNotesLedger,
};
