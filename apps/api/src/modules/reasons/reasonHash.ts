import { keccak256, stringToBytes, type Hex } from "viem";

/** Canonical form of reason text before hashing: NFC-normalised and trimmed. */
export function normalizeReason(text: string): string {
  return text.normalize("NFC").trim();
}

/** keccak256 of the UTF-8 bytes of the normalised text. Must match what the web client passes on-chain. */
export function reasonHash(text: string): Hex {
  return keccak256(stringToBytes(normalizeReason(text)));
}
