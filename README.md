# Rafael Lava Jato & Estética Automotiva

App de gestão (demonstração, sem backend) — mobile-first, instalável (PWA).

**Stack:** Vite + React + TypeScript · Tailwind CSS v4 · Zustand (dados salvos no navegador) · Lucide icons · gráficos em SVG próprio.

## Rodar local
```bash
npm install
npm run dev
```

## Deploy na Vercel
```bash
npm i -g vercel
vercel          # preview
vercel --prod   # produção
```
Ou suba no GitHub e importe o repositório em vercel.com/new (framework: Vite, output: `dist`).

## Módulos
Dashboard · Clientes · Veículos · Agenda (lista/quadro) · Serviços · Orçamentos/OS · Financeiro · WhatsApp (mensagens prontas) · Vistoria (diagrama de avarias + fotos) · Relatórios · Estoque · Configurações (meta, backup, restaurar demo).

Os dados de demonstração acompanham a data de hoje automaticamente. Em **Configurações → Apagar dados e começar do zero** o sistema fica pronto para uso real.
