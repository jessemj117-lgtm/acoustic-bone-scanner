const SUPABASE_URL = "https://axvtbdystaorknqmshgb.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_foSYwlGFQhVlenpa_dBF8g_7092TFz5";
window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
