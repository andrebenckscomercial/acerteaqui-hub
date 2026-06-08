// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AcerteAqui Intelligence Hub â€” FunÃ§Ã£o de geraÃ§Ã£o com IA (OpenAI)
//  Este arquivo roda no SERVIDOR do Netlify, nunca no navegador.
//  A chave da OpenAI fica protegida em variÃ¡vel de ambiente
//  (OPENAI_API_KEY) â€” nunca dentro deste cÃ³digo.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Prompt central do agente (base do escopo) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SYSTEM_BASE = `VocÃª Ã© o agente oficial do AcerteAqui Intelligence Hub.

O AcerteAqui Ã© uma plataforma digital de recuperaÃ§Ã£o de crÃ©dito que conecta
devedores e credores por meio de um portal self-service, marketing multicanal
e um modelo 100% baseado em sucesso (remuneraÃ§Ã£o sÃ³ quando hÃ¡ recuperaÃ§Ã£o).

Sua funÃ§Ã£o Ã© apoiar a equipe comercial, jurÃ­dica, tÃ©cnica e estratÃ©gica
na criaÃ§Ã£o de propostas, anÃ¡lises, e-mails, roteiros e documentos comerciais.

Regras:
- Linguagem profissional, comercial, clara, executiva e pronta para uso com clientes.
- NÃƒO invente nÃºmeros especÃ­ficos, contratos fechados, taxas, cases ou dados
  financeiros que nÃ£o tenham sido informados. Quando faltar informaÃ§Ã£o, assuma
  hipÃ³teses conservadoras e sinalize entre colchetes [PREENCHER: ...] os campos
  que a equipe precisa completar.
- Use portuguÃªs do Brasil.
- Formate a resposta de forma organizada, com tÃ­tulos e seÃ§Ãµes claras.`;

// â”€â”€ InstruÃ§Ãµes especÃ­ficas por tipo de material â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TEMPLATES = {
  proposta: {
    label: 'Proposta comercial',
    instruction: `Gere uma PROPOSTA COMERCIAL do AcerteAqui organizada exatamente nesta estrutura:

1. Contexto do cliente
2. DiagnÃ³stico da oportunidade
3. SoluÃ§Ã£o AcerteAqui
4. Modelo operacional (lembre: remuneraÃ§Ã£o 100% por sucesso)
5. Diferenciais
6. PrÃ³ximos passos
7. SugestÃ£o de reuniÃ£o tÃ©cnica

Seja persuasivo, executivo e especÃ­fico para o segmento informado.`
  },
  inadimplencia: {
    label: 'AnÃ¡lise de inadimplÃªncia',
    instruction: `Gere uma ANÃLISE DE INADIMPLÃŠNCIA / CARTEIRA organizada nesta estrutura:

1. Panorama da carteira (com base no que foi informado)
2. Perfil de risco e faixas de atraso (estime faixas tÃ­picas se nÃ£o houver dados)
3. Potencial de recuperaÃ§Ã£o esperado
4. EstratÃ©gia de abordagem recomendada (canais, tom, faseamento)
5. Como o AcerteAqui executa essa recuperaÃ§Ã£o
6. PrÃ³ximos passos

Onde faltar dado quantitativo, use [PREENCHER: ...] em vez de inventar nÃºmeros.`
  }
};

exports.handler = async (event) => {
  // SÃ³ aceita POST
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'MÃ©todo nÃ£o permitido.' });
  }

  // Confere se a chave estÃ¡ configurada no Netlify
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return resp(500, {
      error: 'A chave da OpenAI nÃ£o estÃ¡ configurada no servidor. Verifique a variÃ¡vel OPENAI_API_KEY no Netlify.'
    });
  }

  // LÃª os dados enviados pela tela
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return resp(400, { error: 'RequisiÃ§Ã£o invÃ¡lida.' });
  }

  const { tipo, cliente, segmento, objetivo, observacoes } = body;

  if (!tipo || !TEMPLATES[tipo]) {
    return resp(400, { error: 'Tipo de material invÃ¡lido.' });
  }
  if (!cliente || !cliente.trim()) {
    return resp(400, { error: 'Informe o nome do cliente.' });
  }

  const tpl = TEMPLATES[tipo];

  // Monta a mensagem do usuÃ¡rio com o contexto do formulÃ¡rio
  const userPrompt = `Tipo de material: ${tpl.label}

Dados informados pela equipe:
- Cliente / credor: ${cliente}
- Segmento: ${segmento || '[nÃ£o informado]'}
- Objetivo: ${objetivo || '[nÃ£o informado]'}
- ObservaÃ§Ãµes: ${observacoes || '[nenhuma]'}

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
      return resp(502, { error: 'A IA nÃ£o conseguiu responder agora. Tente novamente em instantes.' });
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return resp(502, { error: 'A IA retornou uma resposta vazia. Tente novamente.' });
    }

    return resp(200, { content, tipo: tpl.label });

  } catch (err) {
    console.error('Falha na funÃ§Ã£o:', err);
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
