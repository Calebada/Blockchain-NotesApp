const express = require("express");
const { createNotesController } = require("../controllers/notes-controller");

function asyncHandler(handler) {
  return function handleAsyncRoute(req, res, next) {
    return Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createNotesRouter(notesLedger) {
  const router = express.Router();
  const controller = createNotesController(notesLedger);

  router.get("/health", controller.getHealth);
  router.get("/chain", asyncHandler(controller.getChain));
  router.get("/notes/trash", asyncHandler(controller.getTrash));
  router.get("/wallet/transactions", asyncHandler(controller.getWalletTransactions));
  router.post("/notes", asyncHandler(controller.createNote));
  router.put("/notes/:id", asyncHandler(controller.updateNote));
  router.post("/notes/:id/restore", asyncHandler(controller.restoreNote));
  router.delete("/notes/:id/permanent", asyncHandler(controller.permanentlyDeleteNote));
  router.delete("/notes/:id", asyncHandler(controller.deleteNote));

  return router;
}

module.exports = {
  createNotesRouter,
};
