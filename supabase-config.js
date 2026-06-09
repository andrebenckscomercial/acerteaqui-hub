// ═══════════════════════════════════════════════════════════════════
//  AcerteAqui Intelligence Hub — Configuração do Supabase (cliente)
//  Estas chaves são PÚBLICAS (podem ficar no navegador).
//  A chave secreta NÃO está aqui — ela vive só no Netlify.
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yxpygztpwdvdmkazuixl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_sKKQK4oG1uVUaElWhA6ucQ_Oze8tU1v';

// Cliente Supabase (a lib é carregada via <script> antes deste arquivo)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ── Helpers de sessão ──────────────────────────────────────────────

// Garante que há um usuário logado; se não, manda pro login.
async function exigirLogin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

// Pega o perfil (nome, papel) do usuário logado.
async function meuPerfil() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('nome, papel, ativo')
    .eq('id', user.id)
    .single();
  if (error) return { nome: 'Usuário', papel: 'equipe', ativo: true, email: user.email };
  return { ...data, email: user.email };
}

// Token de sessão (para chamar as Netlify Functions protegidas).
async function meuToken() {
  const { data: { session } } = await sb.auth.getSession();
  return session ? session.access_token : null;
}

// Logout
async function sair() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// Iniciais para o avatar (ex.: "Andre Silva" -> "AS")
function iniciais(nome) {
  if (!nome) return 'U';
  const p = nome.trim().split(/\s+/);
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
}
