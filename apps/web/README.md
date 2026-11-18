# Alloy web (`apps/web`)

Next.js 16 + React 19 app for Alloy v2 on Base. See `docs/ARCHITECTURE.md`.

```bash
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_PRIVY_APP_ID
npm run dev
npm test                     # vitest (lib/units.ts)
npm run build                # type-checks
```

Layout:
- `app/` routes: `/` explore, `/b/[address]` basket, `/create`, `/creator`, `/portfolio`
- `app/providers.tsx` Privy + @privy-io/wagmi + React Query + sonner
- `lib/units.ts` bigint money math (USDC 6, B20 8, price 8, shares 18)
- `lib/chains.ts` Base Sepolia / Base, `NEXT_PUBLIC_DEFAULT_CHAIN_ID`
- `lib/contracts.ts` + `lib/addresses.json` addresses (zod), contract-call stubs
- `lib/tx.ts`, `lib/hooks/` write pipeline: quote → approve → simulate → write → receipt → invalidate
- `lib/api/` fetch wrapper (Privy JWT), zod DTOs, query keys
- `lib/mock/` **mock data** used until the API/indexer is live
