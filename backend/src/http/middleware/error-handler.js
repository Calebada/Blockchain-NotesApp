const { AppError } = require("../../common/app-error");

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function createErrorHandler(notesLedger) {
  return function errorHandler(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

    if (statusCode >= 500) {
      console.error(error);
    }

    return res.status(statusCode).json({
      error: error.message || "Unexpected server error.",
      provider: notesLedger.provider,
    });
  };
}

module.exports = {
  createErrorHandler,
  notFoundHandler,
};
