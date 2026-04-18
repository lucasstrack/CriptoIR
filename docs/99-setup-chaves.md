# Guia de configuração de chaves de API

Este guia é para **você, o usuário final** — ele não é consumido por agentes. Será refinado conforme o projeto avança.

## Visão geral das chaves necessárias

| Provider | Uso | Grátis? | Obrigatória p/ v1? |
|---|---|---|---|
| Alchemy | ETH, BASE, ARB | Sim (limite generoso) | Sim, se quiser sincronizar EVM |
| Helius | SOL | Sim (limite generoso) | Sim, se quiser sincronizar Solana |
| CoinGecko | Preços USD/BRL | Sim sem chave (baixo limite); free tier com chave (maior) | Opcional |
| mempool.space | BTC | Sim, sem cadastro | Não exige ação |

## 1. Alchemy (ETH, BASE, ARB)

1. Acesse https://www.alchemy.com e crie uma conta gratuita.
2. Clique em **"Create new app"**.
3. Crie três apps separadas (uma por rede):
   - Chain: **Ethereum**, Network: **Mainnet**
   - Chain: **Base**, Network: **Base Mainnet**
   - Chain: **Arbitrum**, Network: **Arb Mainnet**
4. Em cada app, copie a **API Key** (ou a URL completa `https://<chain>.g.alchemy.com/v2/<KEY>`).
5. No projeto, crie um arquivo `.env.local` (na raiz) e adicione:
   ```
   ALCHEMY_ETH_KEY=sua_chave_aqui
   ALCHEMY_BASE_KEY=sua_chave_aqui
   ALCHEMY_ARB_KEY=sua_chave_aqui
   ```

## 2. Helius (SOL)

1. Acesse https://www.helius.dev e crie uma conta gratuita.
2. No dashboard, gere uma **API Key**.
3. No `.env.local`:
   ```
   HELIUS_KEY=sua_chave_aqui
   ```

## 3. CoinGecko (preços)

**Opção A (simples, sem cadastro):** não faça nada. O `PriceService` usará a API pública (limite ~30 req/min).

**Opção B (recomendada, com chave grátis):**
1. Acesse https://www.coingecko.com/en/api/pricing e crie conta free tier ("Demo").
2. Gere a **API key**.
3. No `.env.local`:
   ```
   COINGECKO_KEY=sua_chave_aqui
   ```

## 4. Verificação

Após configurar, rodar:
```
npm run check:providers
```
(script a ser criado na Onda 1) — faz uma chamada mínima em cada provider e reporta OK/erro.

## Segurança

- `.env.local` está no `.gitignore` — nunca será commitado.
- Nenhuma chave é enviada a serviços de terceiros além dos providers listados.
- Para uso estritamente local, chaves podem ser descartadas/rotacionadas a qualquer momento no dashboard do provider.
