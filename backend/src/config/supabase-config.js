function createSupabaseConfig(env = process.env) {
  return {
    url: env.SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
    tableName: env.SUPABASE_NOTES_TABLE || "notes",
  };
}

module.exports = {
  createSupabaseConfig,
};
