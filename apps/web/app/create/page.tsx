import type { Metadata } from "next";
import { CreateBasketForm } from "@/components/create/CreateBasketForm";
import { getStocks } from "@/lib/data";

export const metadata: Metadata = { title: "Create a basket" };

export default async function CreatePage() {
  const stocks = await getStocks();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-28">
      <h1 className="mb-2 text-3xl font-semibold">Create a basket</h1>
      <p className="mb-8 max-w-2xl text-gray-400">
        Pick stocks, set weights, choose how it rebalances, and seed it. One transaction creates the basket and buys
        your seed position.
      </p>
      <CreateBasketForm stocks={stocks} />
    </div>
  );
}
