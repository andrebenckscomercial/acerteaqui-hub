// ═══════════════════════════════════════════════════════════════════
//  AcerteAqui Intelligence Hub — Função de geração com IA (OpenAI)
//  Este arquivo roda no SERVIDOR do Netlify, nunca no navegador.
//  A chave da OpenAI fica protegida em variável de ambiente
//  (OPENAI_API_KEY) — nunca dentro deste código.
// ═══════════════════════════════════════════════════════════════════

// ── Prompt central do agente (base do escopo) ─────────────────────────
const SYSTEM_BASE = `Você é o agente oficial do AcerteAqui Intelligence Hub.

O AcerteAqui é uma plataforma digital de recuperação de crédito que conecta
devedores e credores por meio de um portal self-service, marketing multicanal
e um modelo 100% baseado em sucesso (remuneração só quando há recuperação).

Sua função é apoiar a equipe comercial, jurídica, técnica e estratégica
na criação de propostas, análises, e-mails, roteiros e documentos comerciais.

Regras:
- Linguagem profissional, comercial, clara, executiva e pronta para uso com clientes.
- NÃO invente números específicos, contratos fechados, taxas, cases ou dados
  financeiros que não tenham sido informados. Quando faltar informação, assuma
  hipóteses conservadoras e sinalize entre colchetes [PREENCHER: ...] os campos
  que a equipe precisa completar.
- Use português do Brasil.
- Formate a resposta de forma organizada, com títulos e seções claras.`;

// ── Instruções específicas por tipo de material ──────────────────────
const TEMPLATES = {
  proposta: {
    label: 'Proposta comercial',
    instruction: `Gere uma PROPOSTA COMERCIAL do AcerteAqui organizada exatamente nesta estrutura:

1. Contexto do cliente
2. Diagnóstico da oportunidade
3. Solução AcerteAqui
4. Modelo operacional (lembre: remuneração 100% por sucesso)
5. Diferenciais
6. Próximos passos
7. Sugestão de reunião técnica

Seja persuasivo, executivo e específico para o segmento informado.`
  },
  inadimplencia: {
    label: 'Análise de inadimplência',
    instruction: `Gere uma ANÁLISE DE INADIMPLÊNCIA / CARTEIRA organizada nesta estrutura:

1. Panorama da carteira (com base no que foi informado)
2. Perfil de risco e faixas de atraso (estime faixas típicas se não houver dados)
3. Potencial de recuperação esperado
4. Estratégia de abordagem recomendada (canais, tom, faseamento)
5. Como o AcerteAqui executa essa recuperação
6. Próximos passos

Onde faltar dado quantitativo, use [PREENCHER: ...] em vez de inventar números.`
  }
};

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Método não permitido.' });
  }

  // Confere se a chave está configurada no Netlify
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return resp(500, {
      error: 'A chave da OpenAI não está configurada no servidor. Verifique a variável OPENAI_API_KEY no Netlify.'
    });
  }

  // Lê os dados enviados pela tela
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return resp(400, { error: 'Requisição inválida.' });
  }

  const { tipo, cliente, segmento, objetivo, observacoes } = body;

  if (!tipo || !TEMPLATES[tipo]) {
    return resp(400, { error: 'Tipo de material inválido.' });
  }
  if (!cliente || !cliente.trim()) {
    return resp(400, { error: 'Informe o nome do cliente.' });
  }

  const tpl = TEMPLATES[tipo];

  // Monta a mensagem do usuário com o contexto do formulário
  const userPrompt = `Tipo de material: ${tpl.label}

Dados informados pela equipe:
- Cliente / credor: ${cliente}
- Segmento: ${segmento || '[não informado]'}
- Objetivo: ${objetivo || '[não informado]'}
- Observações: ${observacoes || '[nenhuma]'}

${tpl.instruction}`;

  // Chama a OpenAI
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: SYSTEM_BASE },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Erro OpenAI:', errText);
      return resp(502, { error: 'A IA não conseguiu responder agora. Tente novamente em instantes.' });
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return resp(502, { error: 'A IA retornou uma resposta vazia. Tente novamente.' });
    }

    return resp(200, { content, tipo: tpl.label });

  } catch (err) {
    console.error('Falha na função:', err);
    return resp(500, { error: 'Erro interno ao gerar o material.' });
  }
};

// Helper para padronizar respostas
function resp(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };
}
