const express = require("express");
const { createNotesController } = require("../controllers/notes-controller");

function asyncHandler(handler) {
  return function handleAsyncRoute(req, res, next) {
    return Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createNotesRouter(notesLedger, noteTransactionService) {
  const router = express.Router();
  const controller = createNotesController(notesLedger);

  router.get("/health", controller.getHealth);
  router.get("/chain", asyncHandler(controller.getChain));
  router.get("/notes/trash", asyncHandler(controller.getTrash));
  router.get("/activity", asyncHandler(controller.getActivity));
  router.get("/wallet/transactions", asyncHandler(controller.getWalletTransactions));
  router.post(
    "/transactions/prepare",
    asyncHandler(async (req, res) => {
      res.json(await noteTransactionService.prepare(req.body));
    })
  );
  router.post(
    "/transactions/submit",
    asyncHandler(async (req, res) => {
      res.status(202).json(await noteTransactionService.submit(req.body));
    })
  );
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
