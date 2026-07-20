const { AppError } = require("../../common/app-error");
const { createSupabaseConfig } = require("../../config/supabase-config");
const { MemoryNotesRepository } = require("./memory-notes-repository");
const { SupabaseNotesRepository } = require("./supabase-notes-repository");

function createNotesRepository(options = {}) {
  const config = options.supabaseConfig || createSupabaseConfig();
  const hasSupabaseUrl = Boolean(config.url);
  const hasSupabaseKey = Boolean(config.key);

  if (hasSupabaseUrl !== hasSupabaseKey) {
    throw new AppError(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set together. Use SUPABASE_ANON_KEY only if your table policies allow backend writes.",
      500
    );
  }

  if (hasSupabaseUrl && hasSupabaseKey) {
    return new SupabaseNotesRepository(config);
  }

  return new MemoryNotesRepository();
}

module.exports = {
  createNotesRepository,
};
