// ==========================================================
// CONFIGURAÇÃO SEGURA DO SUPABASE
// ==========================================================
const SUPABASE_URL = 'https://lcpokvwgssgaqdkjbymx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tQ8j-bA9u50hzHzK6SbmSA_DZzJ4tyn';

let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("⚠️ A biblioteca do Supabase não foi carregada no HTML.");
    }
} catch (erro) {
    console.error("Erro ao inicializar o Supabase:", erro);
}