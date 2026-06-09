// ═══════════════════════════════════════════════════════════════════
//  AcerteAqui Intelligence Hub — Criação de usuários (somente admin)
//  Roda no servidor do Netlify. Usa a chave SECRETA do Supabase
//  (sb_secret_...), que NUNCA pode ir para o navegador.
//
//  IMPORTANTE (chaves novas do Supabase):
//   - A chave (publishable/secret) vai SEMPRE no header "apikey".
//   - O header "Authorization: Bearer ..." carrega o TOKEN DE SESSÃO
//     do usuário (um JWT), nunca a chave.
//
//  Variáveis de ambiente necessárias no Netlify:
//    SUPABASE_URL         → URL do projeto (pública)
//    SUPABASE_SECRET_KEY  → chave sb_secret_... (SECRETA)
// ═══════════════════════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Método não permitido.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SECRET_KEY) {
    return resp(500, { error: 'Configuração do Supabase ausente no servidor.' });
  }

  // Token de sessão de quem está chamando (vem do login no navegador)
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) {
    return resp(401, { error: 'Não autenticado.' });
  }

  // 1) Descobre quem é o usuário do token.
  //    apikey = chave secreta | Authorization = token do usuário
  let solicitante;
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${userToken}`
      }
    });
    if (!u.ok) return resp(401, { error: 'Sessão inválida. Faça login novamente.' });
    solicitante = await u.json();
  } catch {
    return resp(401, { error: 'Não foi possível validar a sessão.' });
  }

  // 2) Confere no banco se esse usuário tem papel = admin.
  //    Para ler como serviço, a chave secreta vai no apikey E no Bearer
  //    (aqui o "Bearer" é aceito porque, no acesso REST de serviço, o
  //     gateway traduz a chave; mas para máxima compatibilidade com as
  //     chaves novas usamos apikey e deixamos o Authorization com a mesma
  //     chave apenas quando não há sessão de usuário envolvida).
  try {
    const pr = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${solicitante.id}&select=papel`,
      {
        headers: {
          apikey: SECRET_KEY,
          Authorization: `Bearer ${SECRET_KEY}`
        }
      }
    );
    const rows = await pr.json();
    if (!Array.isArray(rows) || !rows[0] || rows[0].papel !== 'admin') {
      return resp(403, { error: 'Apenas administradores podem criar usuários.' });
    }
  } catch {
    return resp(500, { error: 'Falha ao verificar permissões.' });
  }

  // 3) Lê os dados do novo usuário
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp(400, { error: 'Requisição inválida.' }); }

  const { nome, email, senha, papel } = body;
  if (!nome || !nome.trim())   return resp(400, { error: 'Informe o nome.' });
  if (!email || !email.trim()) return resp(400, { error: 'Informe o e-mail.' });
  if (!senha || senha.length < 6) return resp(400, { error: 'A senha precisa ter ao menos 6 caracteres.' });
  const papelFinal = (papel === 'admin') ? 'admin' : 'equipe';

  // 4) Cria o usuário via Admin API (confirma o e-mail automaticamente)
  try {
    const cr = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim(),
        password: senha,
        email_confirm: true,
        user_metadata: { nome: nome.trim(), papel: papelFinal }
      })
    });

    const data = await cr.json();
    if (!cr.ok) {
      const msg = data.msg || data.error_description || data.error || 'Erro ao criar usuário.';
      if (/already/i.test(msg) || /registered/i.test(msg) || /exists/i.test(msg)) {
        return resp(409, { error: 'Já existe um usuário com este e-mail.' });
      }
      return resp(400, { error: msg });
    }

    return resp(200, {
      ok: true,
      usuario: { id: data.id, email: data.email, nome: nome.trim(), papel: papelFinal }
    });

  } catch (err) {
    console.error('Falha ao criar usuário:', err);
    return resp(500, { error: 'Erro interno ao criar usuário.' });
  }
};

function resp(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  };
}
