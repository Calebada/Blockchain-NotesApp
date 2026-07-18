const express = require("express");

function createApiRouter(notesLedger) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "blockchain-notes-api",
      provider: notesLedger.provider,
    });
  });

  router.get("/chain", async (req, res) => {
    try {
      res.json(await notesLedger.getState());
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error.message || "Unable to fetch Cardano chain state.",
        provider: notesLedger.provider,
      });
    }
  });

  router.post("/notes", async (req, res) => {
    const { author, content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        error: "Note content is required.",
      });
    }

    try {
      const block = await notesLedger.addNote({
        author: typeof author === "string" ? author.trim() : "anonymous",
        content: content.trim(),
      });

      return res.status(201).json({
        message: "Note anchored to the latest Cardano block through Blockfrost.",
        block,
        valid: notesLedger.isChainValid(),
        provider: notesLedger.provider,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "The note could not be anchored with Blockfrost.",
        provider: notesLedger.provider,
      });
    }
  });

  return router;
}

module.exports = {
  createApiRouter,
};
