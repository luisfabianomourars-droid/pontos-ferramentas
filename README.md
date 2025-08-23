# Sistema de Controle de Presença

## Deploy na Vercel

### Pré-requisitos
1. Conta no GitHub
2. Conta na Vercel
3. Projeto Supabase configurado

### Passos para Deploy

#### 1. Configurar Variáveis de Ambiente
Na Vercel, adicione as seguintes variáveis:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

#### 2. Configurações de Build
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Framework: `vite`

#### 3. Deploy Automático
O projeto está configurado para deploy automático via GitHub.

## Desenvolvimento Local

```bash
npm install
npm run dev
```

## Tecnologias
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Vercel