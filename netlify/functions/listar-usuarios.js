// ═══════════════════════════════════════════════════════════════════
//  AcerteAqui Intelligence Hub — Listar usuários (somente admin)
//  Devolve a lista de perfis (nome, e-mail, papel, ativo) para a
//  tela de gestão. Só responde se quem chama for admin.
// ═══════════════════════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return resp(405, { error: 'Método não permitido.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !SECRET_KEY) {
    return resp(500, { error: 'Configuração do Supabase ausente no servidor.' });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return resp(401, { error: 'Não autenticado.' });

  // Quem está chamando?
  let solicitante;
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SECRET_KEY, Authorization: `Bearer ${userToken}` }
    });
    if (!u.ok) return resp(401, { error: 'Sessão inválida.' });
    solicitante = await u.json();
  } catch {
    return resp(401, { error: 'Não foi possível validar a sessão.' });
  }

  // É admin?
  try {
    const pr = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${solicitante.id}&select=papel`,
      { headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` } }
    );
    const rows = await pr.json();
    if (!Array.isArray(rows) || !rows[0] || rows[0].papel !== 'admin') {
      return resp(403, { error: 'Apenas administradores podem ver os usuários.' });
    }
  } catch {
    return resp(500, { error: 'Falha ao verificar permissões.' });
  }

  // Lista os perfis + e-mails (e-mail vem do auth via admin)
  try {
    // perfis (nome, papel, ativo, criado_em)
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,nome,papel,ativo,criado_em&order=criado_em.desc`,
      { headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` } }
    );
    const perfis = await pRes.json();

    // e-mails do auth (admin) — mapeia id -> email
    const aRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
      headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` }
    });
    const authData = await aRes.json();
    const emailById = {};
    (authData.users || []).forEach(u => { emailById[u.id] = u.email; });

    const lista = (perfis || []).map(p => ({
      id: p.id,
      nome: p.nome,
      email: emailById[p.id] || '—',
      papel: p.papel,
      ativo: p.ativo,
      criado_em: p.criado_em
    }));

    return resp(200, { usuarios: lista });

  } catch (err) {
    console.error('Falha ao listar usuários:', err);
    return resp(500, { error: 'Erro ao listar usuários.' });
  }
};

function resp(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  };
}
