/*
 * ================================================================
 * SUPABASE CONFIGURATION
 * ================================================================
 *
 * Replace the two values below with the values from:
 *
 * Supabase
 * → Project Settings
 * → API
 *
 * Use:
 * Project URL
 * anon / publishable key
 *
 * DO NOT put the service_role key here.
 * ================================================================
 */

const SUPABASE_URL = "https://axvtbdystaorknqmshgb.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_foSYwlGFQhVlenpa_dBF8g_7092TFz5";


/*
 * Wait until the Supabase CDN has loaded.
 */

function createSupabaseClient() {

    if (!window.supabase) {

        console.error(
            "Supabase JavaScript library has not loaded."
        );

        return null;
    }


    return window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}


window.supabaseClient =
    createSupabaseClient();
