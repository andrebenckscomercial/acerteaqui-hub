# AcerteAqui Intelligence Hub

Central interna de inteligência comercial do AcerteAqui: login, painel,
gerador de materiais por IA (propostas e análises de inadimplência) e,
nas próximas etapas, clientes, biblioteca e histórico.

## Estrutura

```
acerteaqui-hub/
├── index.html              → tela de login
├── dashboard.html          → painel principal
├── gerador.html            → gerador de materiais com IA
├── netlify.toml            → configuração do Netlify
└── netlify/
    └── functions/
        └── gerar.js        → ponte segura com a OpenAI (roda no servidor)
```

## Segurança da chave da OpenAI

A chave **nunca** fica no código. Ela é configurada no painel do Netlify como
variável de ambiente com o nome:

```
OPENAI_API_KEY
```

O arquivo `netlify/functions/gerar.js` lê essa variável no servidor. O navegador
nunca tem acesso a ela.

## Acesso de demonstração (provisório)

```
admin@acerteaqui.com / acerte123
```

Será substituído por login real nas próximas etapas.

## Modelo de IA

Usa `gpt-4o` da OpenAI.
