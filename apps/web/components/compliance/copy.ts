/** ARCHITECTURE §7 copy & legal guardrails. Keep wording centralised. */
export const GLOBAL_DISCLAIMER =
  "Alloy baskets provide tokenized stock exposure; holding a basket token does not mean you own shares or have shareholder rights. " +
  "Not available to US persons. Nothing here is investment advice. Past performance does not guarantee future results, " +
  "and you can lose money. Alloy is not backed by, partnered with or endorsed by any exchange, issuer or network.";

export const US_PERSON_ATTESTATION =
  "I confirm I am not a US person (not a US citizen or resident, and not acting on behalf of one), and that I am allowed to access tokenized stock exposure where I live.";

export const PAST_PERFORMANCE = "Past performance is not indicative of future results. Values are estimates from oracle prices.";

export const AI_LABEL = "AI-generated, not investment advice.";

export const MARKET_CLOSED_NOTE =
  "The US market is closed. You can still trade 24/7 at DEX prices, but prices may be wider and move when the market reopens. In-kind withdraw is always available.";

export function storyDisclosure(source: string, date: string) {
  return `Based on ${source} dated ${date}. Not affiliated with, or endorsed by, the people or entities named.`;
}
