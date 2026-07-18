function createSupabaseConfig(env = process.env) {
  return {
    url: env.SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
    tableName: env.SUPABASE_NOTE_BLOCKS_TABLE || "note_blocks",
  };
}

module.exports = {
  createSupabaseConfig,
};
