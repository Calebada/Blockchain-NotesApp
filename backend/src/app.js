const express = require("express");
const cors = require("cors");
const { createApiRouter } = require("./routes/api-routes");
const { NotesLedger } = require("./services/notes-ledger");

function createApp(options = {}) {
  const app = express();
  const notesLedger = options.notesLedger || new NotesLedger(options.ledgerOptions);

  app.use(cors());
  app.use(express.json());
  app.use("/api", createApiRouter(notesLedger));

  return {
    app,
    notesLedger,
  };
}

module.exports = {
  createApp,
};
