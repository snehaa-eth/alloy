import { readFileSync } from "node:fs";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { deployments } from "/Users/snehagupta/Desktop/crates/packages/sdk/src/generated";
const seed = Object.fromEntries(readFileSync("/Users/snehagupta/Desktop/crates/packages/testnet-env/.env.seed","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1).trim()]));
const local = Object.fromEntries(readFileSync("/Users/snehagupta/Desktop/crates/apps/web/.env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1).trim().replace(/^"|"$/g,"")]));
const c = createPublicClient({ chain: baseSepolia, transport: http(local.RPC_URL_84532) });
const d = deployments["84532"];
console.log("router", d.contracts.router, "usdc", d.contracts.usdc, "rpc host", new URL(local.RPC_URL_84532).host);
for (let i=1;i<=7;i++){ const a = seed[`FOLLOWER_${i}_ADDR`] as `0x${string}`;
 const [e,u,s]=await Promise.all([c.getBalance({address:a}), c.readContract({address:d.contracts.usdc as any,abi:erc20Abi,functionName:"balanceOf",args:[a]}), c.readContract({address:"0xA6665F87702Ba1cDeF544E890147B2b5d305Cec3",abi:erc20Abi,functionName:"balanceOf",args:[a]})]);
 console.log(i,a,"ETH",formatUnits(e,18),"tUSDC",formatUnits(u,6),"AIshares",formatUnits(s,18)); }
