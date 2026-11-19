/**
 * Injected EIP-1193 test wallet for Playwright, backed by a viem account on Base Sepolia.
 * The key is read from process.env.E2E_PK inside the Node process only; the page only ever sees the address.
 * Announced via EIP-6963 (name "Alloy E2E Wallet") so Privy's "Continue with a wallet" lists it.
 */
import type { Page } from "@playwright/test";
import { createWalletClient, http, numberToHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { pub, RPC } from "./chain";

export type WalletLog = { t: number; method: string; detail?: string };

export function hasKey() {
  return /^0x[0-9a-fA-F]{64}$/.test(process.env.E2E_PK ?? "");
}

export async function installWallet(page: Page) {
  const account = privateKeyToAccount(process.env.E2E_PK as Hex);
  const wc = createWalletClient({ account, chain: baseSepolia, transport: http(RPC, { retryCount: 3 }) });
  let chainId = baseSepolia.id;
  const log: WalletLog[] = [];
  const sent: { hash: Hex; to?: string; at: number }[] = [];

  await page.exposeFunction("__e2eRpc", async (method: string, paramsJson: string) => {
    const params = paramsJson ? JSON.parse(paramsJson) : [];
    log.push({ t: Date.now(), method });
    try {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return { result: [account.address] };
        case "eth_chainId":
          return { result: numberToHex(chainId) };
        case "net_version":
          return { result: String(chainId) };
        case "wallet_switchEthereumChain": {
          const id = Number(params[0]?.chainId);
          if (id !== baseSepolia.id) return { error: { code: 4902, message: `E2E wallet only supports ${baseSepolia.id}` } };
          chainId = id;
          return { result: null, emit: ["chainChanged", numberToHex(chainId)] };
        }
        case "wallet_addEthereumChain":
          return { result: null };
        case "wallet_getPermissions":
        case "wallet_requestPermissions":
          return { result: [{ parentCapability: "eth_accounts" }] };
        case "personal_sign": {
          const [msg, who] = params as [Hex, Address];
          // some dapps swap the order
          const raw = msg.toLowerCase() === account.address.toLowerCase() ? (who as Hex) : msg;
          const isHex = /^0x[0-9a-fA-F]*$/.test(raw);
          const sig = await account.signMessage({ message: isHex ? { raw } : raw });
          log[log.length - 1].detail = "signed";
          return { result: sig };
        }
        case "eth_signTypedData_v4":
        case "eth_signTypedData": {
          const typed = typeof params[1] === "string" ? JSON.parse(params[1]) : params[1];
          const { EIP712Domain: _d, ...types } = typed.types;
          return { result: await account.signTypedData({ domain: typed.domain, types, primaryType: typed.primaryType, message: typed.message }) };
        }
        case "eth_sendTransaction": {
          const tx = params[0];
          const hash = await wc.sendTransaction({
            account,
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : undefined,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
          });
          sent.push({ hash, to: tx.to, at: Date.now() });
          log[log.length - 1].detail = hash;
          return { result: hash };
        }
        default:
          if (method.startsWith("wallet_")) return { error: { code: 4200, message: `Unsupported ${method}` } };
          return { result: await pub.request({ method: method as never, params: params as never }) };
      }
    } catch (e) {
      const err = e as { code?: number; shortMessage?: string; message?: string };
      return { error: { code: err.code ?? -32603, message: err.shortMessage ?? err.message ?? String(e) } };
    }
  });

  await page.addInitScript((address: string) => {
    type L = (...a: unknown[]) => void;
    const listeners: Record<string, Set<L>> = {};
    const emit = (ev: string, v: unknown) => listeners[ev]?.forEach((f) => { try { f(v); } catch { /* */ } });
    const provider = {
      isAlloyE2E: true,
      isMetaMask: false,
      selectedAddress: address,
      async request({ method, params }: { method: string; params?: unknown }) {
        // @ts-expect-error bridged
        const r = await window.__e2eRpc(method, params === undefined ? "" : JSON.stringify(params));
        if (r.error) {
          const e = new Error(r.error.message) as Error & { code?: number };
          e.code = r.error.code;
          throw e;
        }
        if (r.emit) setTimeout(() => emit(r.emit[0], r.emit[1]), 0);
        if (method === "eth_requestAccounts") setTimeout(() => emit("connect", { chainId: "0x14a34" }), 0);
        return r.result;
      },
      on(ev: string, f: L) { (listeners[ev] ??= new Set()).add(f); return provider; },
      removeListener(ev: string, f: L) { listeners[ev]?.delete(f); return provider; },
      off(ev: string, f: L) { listeners[ev]?.delete(f); return provider; },
      enable() { return provider.request({ method: "eth_requestAccounts" }); },
    };
    const icon =
      "data:image/svg+xml;base64," +
      btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#2E7D5B"/><text x="16" y="21" font-size="13" text-anchor="middle" fill="#fff" font-family="sans-serif">E2E</text></svg>');
    const info = { uuid: "7d0c9c1e-0e2e-4e2e-8e2e-a110e2e00001", name: "Alloy E2E Wallet", icon, rdns: "dev.alloy.e2e" };
    const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
    window.addEventListener("eip6963:requestProvider", announce);
    announce();
    // @ts-expect-error test hook
    window.__e2eProvider = provider;
  }, account.address);

  return { address: account.address, log, sent };
}
