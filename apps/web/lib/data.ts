/**
 * Read layer used by pages. Returns MOCK data today (lib/mock/).
 * TODO(api): swap each function body for apiFetch() against apps/api
 * (/baskets, /baskets/:a, /baskets/:a/performance, /baskets/:a/rebalances, /stocks).
 */
import type { Address, Basket, Performance, RebalanceEvent, Stock } from "./types";
import { MOCK_BASKETS, mockPerformance, mockRebalances } from "./mock/baskets";
import { MOCK_STOCKS } from "./mock/stocks";
import { navPerShareUsd6, navUsd6 } from "./units";

export async function getStocks(): Promise<Stock[]> {
  return MOCK_STOCKS;
}

export async function getBaskets(): Promise<Basket[]> {
  return MOCK_BASKETS;
}

export async function getBasket(address: Address): Promise<Basket | null> {
  return MOCK_BASKETS.find((b) => b.address.toLowerCase() === address.toLowerCase()) ?? null;
}

export async function getPerformance(basket: Basket): Promise<Performance> {
  return mockPerformance(basket);
}

export async function getRebalances(basket: Basket): Promise<RebalanceEvent[]> {
  return mockRebalances(basket);
}

export function basketNav(basket: Basket): { nav: bigint; navPerShare: bigint } {
  const nav = navUsd6(basket.components.map((c) => ({ balance: c.balance8, price: c.stock.price8 })));
  return { nav, navPerShare: navPerShareUsd6(nav, basket.totalSupply) };
}
