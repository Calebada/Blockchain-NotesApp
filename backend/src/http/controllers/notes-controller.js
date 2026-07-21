const { validateNotePayload } = require("../middleware/request-validator");

function createNotesController(notesLedger) {
  return {
    getHealth(req, res) {
      res.json({
        status: "ok",
        service: "blockchain-notes-api",
        provider: notesLedger.provider,
      });
    },

    async getChain(req, res) {
      res.json(await notesLedger.getState());
    },

    async createNote(req, res) {
      const { block, valid } = await notesLedger.addNote(validateNotePayload(req.body));

      res.status(201).json({
        message: "Note anchored to the latest Cardano block through Blockfrost.",
        block,
        valid,
        provider: notesLedger.provider,
      });
    },

    async getTrash(req, res) {
      res.json(await notesLedger.getTrashState());
    },

    async getWalletTransactions(req, res) {
      res.json(await notesLedger.getWalletTransactions());
    },

    async updateNote(req, res) {
      const { block, valid } = await notesLedger.updateNote(
        req.params.id,
        validateNotePayload(req.body)
      );

      res.json({
        message: "Note updated and the local proof chain was recalculated.",
        block,
        valid,
        provider: notesLedger.provider,
      });
    },

    async restoreNote(req, res) {
      const { block, valid } = await notesLedger.restoreNote(req.params.id);

      res.json({
        message: "Note restored and the local proof chain was recalculated.",
        block,
        valid,
        provider: notesLedger.provider,
      });
    },

    async permanentlyDeleteNote(req, res) {
      const { valid } = await notesLedger.hardDeleteNote(req.params.id);

      res.json({
        message: "Note permanently deleted.",
        valid,
        provider: notesLedger.provider,
      });
    },

    async deleteNote(req, res) {
      const { valid } = await notesLedger.deleteNote(req.params.id);

      res.json({
        message: "Note moved to trash and the local proof chain was recalculated.",
        valid,
        provider: notesLedger.provider,
      });
    },
  };
}

module.exports = {
  createNotesController,
};
