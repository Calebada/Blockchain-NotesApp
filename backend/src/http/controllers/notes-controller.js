const { validateNotePayload } = require("../middleware/request-validator");

function getWalletAddressFromRequest(req) {
  if (typeof req.body?.walletAddress === "string") {
    return req.body.walletAddress;
  }

  if (typeof req.query.walletAddress === "string") {
    return req.query.walletAddress;
  }

  return "";
}

function getActivityPaginationFromRequest(req) {
  const page = Number.parseInt(req.query.page, 10);
  const pageSize = Number.parseInt(req.query.pageSize, 10);

  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 10,
  };
}

function getChainDetailsFromRequest(req) {
  return {
    proofHash: typeof req.body?.proofHash === "string" ? req.body.proofHash : "",
    cardanoTxHash:
      typeof req.body?.cardanoTxHash === "string" ? req.body.cardanoTxHash : "",
    confirmationStatus:
      typeof req.body?.confirmationStatus === "string"
        ? req.body.confirmationStatus
        : "Pending",
    validUntilSlot:
      Number.isSafeInteger(req.body?.validUntilSlot) ? req.body.validUntilSlot : null,
    proofPayload:
      req.body?.proofPayload && typeof req.body.proofPayload === "object"
        ? req.body.proofPayload
        : null,
  };
}

function createNotesController(notesLedger) {
  async function runTrackedMutation(req, mutation) {
    const chainDetails = getChainDetailsFromRequest(req);

    try {
      return await mutation({
        walletAddress: getWalletAddressFromRequest(req),
        ...chainDetails,
      });
    } catch (error) {
      if (typeof notesLedger.markNoteSaveFailed === "function") {
        await notesLedger
          .markNoteSaveFailed(chainDetails.cardanoTxHash, error)
          .catch(() => {});
      }
      throw error;
    }
  }

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
      const { block, valid } = await runTrackedMutation(req, (options) =>
        notesLedger.addNote(validateNotePayload(req.body), options)
      );

      res.status(201).json({
        message: "Note created after its signed Preprod transaction was submitted.",
        block,
        valid,
        provider: notesLedger.provider,
      });
    },

    async getTrash(req, res) {
      res.json(await notesLedger.getTrashState());
    },

    async getActivity(req, res) {
      res.json(
        await notesLedger.getActivity(getWalletAddressFromRequest(req), {
          pagination: getActivityPaginationFromRequest(req),
        })
      );
    },

    async getWalletTransactions(req, res) {
      res.json(await notesLedger.getWalletTransactions(getWalletAddressFromRequest(req)));
    },

    async verifyProof(req, res) {
      res.json(
        await notesLedger.verifyActivityProof(
          req.params.id,
          getWalletAddressFromRequest(req)
        )
      );
    },

    async retrySavingNote(req, res) {
      res.json(
        await notesLedger.retrySavingNote(
          req.params.id,
          getWalletAddressFromRequest(req)
        )
      );
    },

    async updateNote(req, res) {
      const { block, valid } = await runTrackedMutation(req, (options) =>
        notesLedger.updateNote(
          req.params.id,
          validateNotePayload(req.body),
          options
        )
      );

      res.json({
        message: "Note updated and the local proof chain was recalculated.",
        block,
        valid,
        provider: notesLedger.provider,
      });
    },

    async restoreNote(req, res) {
      const { block, valid } = await runTrackedMutation(req, (options) =>
        notesLedger.restoreNote(req.params.id, options)
      );

      res.json({
        message: "Note restored and the local proof chain was recalculated.",
        block,
        valid,
        provider: notesLedger.provider,
      });
    },

    async permanentlyDeleteNote(req, res) {
      const { valid } = await runTrackedMutation(req, (options) =>
        notesLedger.hardDeleteNote(req.params.id, options)
      );

      res.json({
        message: "Note permanently deleted.",
        valid,
        provider: notesLedger.provider,
      });
    },

    async deleteNote(req, res) {
      const { valid } = await runTrackedMutation(req, (options) =>
        notesLedger.deleteNote(req.params.id, options)
      );

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
