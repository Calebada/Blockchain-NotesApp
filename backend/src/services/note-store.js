const { createSupabaseConfig } = require("../config/supabase-config");
const { MemoryNoteStore } = require("./memory-note-store");
const { SupabaseNoteStore } = require("./supabase-note-store");

function createNoteStore(options = {}) {
  const config = options.supabaseConfig || createSupabaseConfig();
  const hasSupabaseUrl = Boolean(config.url);
  const hasSupabaseKey = Boolean(config.key);

  if (hasSupabaseUrl !== hasSupabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set together. Use SUPABASE_ANON_KEY only if your table policies allow backend writes."
    );
  }

  if (hasSupabaseUrl && hasSupabaseKey) {
    return new SupabaseNoteStore(config);
  }

  return new MemoryNoteStore();
}

module.exports = {
  createNoteStore,
};
