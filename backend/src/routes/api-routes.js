const express = require("express");

function createApiRouter(notesLedger) {
  const router = express.Router();

  function parseStoredNoteContent(content) {
    try {
      const parsed = JSON.parse(content);

      if (parsed && typeof parsed === "object" && typeof parsed.content === "string") {
        return {
          title: typeof parsed.title === "string" ? parsed.title.trim() : "",
          tag: typeof parsed.tag === "string" && parsed.tag.trim() ? parsed.tag.trim() : "General",
          content: parsed.content.trim(),
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  function parseNotePayload(req, res) {
    const { author, title, tag, content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(400).json({
        error: "Note content is required.",
      });
      return null;
    }

    const parsedContent = parseStoredNoteContent(content.trim());

    return {
      author: typeof author === "string" && author.trim() ? author.trim() : "anonymous",
      title: typeof title === "string" ? title.trim() : parsedContent?.title || "",
      tag: typeof tag === "string" && tag.trim() ? tag.trim() : parsedContent?.tag || "General",
      content: parsedContent?.content || content.trim(),
    };
  }

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
    const notePayload = parseNotePayload(req, res);

    if (!notePayload) {
      return undefined;
    }

    try {
      const block = await notesLedger.addNote(notePayload);

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

  router.get("/notes/trash", async (req, res) => {
    try {
      res.json(await notesLedger.getTrashState());
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error.message || "Unable to fetch deleted notes.",
        provider: notesLedger.provider,
      });
    }
  });

  router.put("/notes/:id", async (req, res) => {
    const notePayload = parseNotePayload(req, res);

    if (!notePayload) {
      return undefined;
    }

    try {
      const block = await notesLedger.updateNote(req.params.id, notePayload);

      return res.json({
        message: "Note updated and the local proof chain was recalculated.",
        block,
        valid: notesLedger.isChainValid(),
        provider: notesLedger.provider,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "The note could not be updated.",
        provider: notesLedger.provider,
      });
    }
  });

  router.post("/notes/:id/restore", async (req, res) => {
    try {
      const block = await notesLedger.restoreNote(req.params.id);

      return res.json({
        message: "Note restored and the local proof chain was recalculated.",
        block,
        valid: notesLedger.isChainValid(),
        provider: notesLedger.provider,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "The note could not be restored.",
        provider: notesLedger.provider,
      });
    }
  });

  router.delete("/notes/:id/permanent", async (req, res) => {
    try {
      await notesLedger.hardDeleteNote(req.params.id);

      return res.json({
        message: "Note permanently deleted.",
        valid: notesLedger.isChainValid(),
        provider: notesLedger.provider,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "The note could not be permanently deleted.",
        provider: notesLedger.provider,
      });
    }
  });

  router.delete("/notes/:id", async (req, res) => {
    try {
      await notesLedger.deleteNote(req.params.id);

      return res.json({
        message: "Note moved to trash and the local proof chain was recalculated.",
        valid: notesLedger.isChainValid(),
        provider: notesLedger.provider,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "The note could not be deleted.",
        provider: notesLedger.provider,
      });
    }
  });

  return router;
}

module.exports = {
  createApiRouter,
};
