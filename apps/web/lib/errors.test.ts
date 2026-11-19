import { describe, expect, it } from "vitest";
import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  encodeErrorResult,
  parseAbi,
} from "viem";
import { alloyRouterAbi, allErrorsAbi, faucetAbi } from "./abis";
import { decodeRevertData, describeTxErrorCore, messageForError } from "./errors";
import { builderDataSuffix } from "./contracts";

const guard = parseAbi(["error StaleFeed(address feed, uint256 updatedAt)", "error PolicyForbids(bytes32 policyScope, uint64 policyId)"]);
const FEED = "0x98B1aC6A0aa36bC34D5FAC0b1a51C33c3407d625";

/** Simulate what viem throws from simulateContract when the router reverts with `data`. */
function revertErr(data: `0x${string}`) {
  const cause = new ContractFunctionRevertedError({ abi: alloyRouterAbi, data, functionName: "buy" });
  return new ContractFunctionExecutionError(cause, { abi: alloyRouterAbi, functionName: "buy", args: [] });
}

describe("decodeRevertData", () => {
  it("decodes guard errors that bubble through the router", () => {
    const data = encodeErrorResult({ abi: guard, errorName: "StaleFeed", args: [FEED, 1n] });
    expect(decodeRevertData(data)?.name).toBe("StaleFeed");
  });
  it("returns null for unknown / empty data", () => {
    expect(decodeRevertData("0x")).toBeNull();
    expect(decodeRevertData("0xdeadbeef")).toBeNull();
  });
});

describe("describeTxErrorCore", () => {
  it("maps router slippage errors to plain English", () => {
    const data = encodeErrorResult({ abi: alloyRouterAbi, errorName: "InsufficientShares", args: [1n, 2n] });
    expect(describeTxErrorCore(revertErr(data))).toMatch(/slippage/);
  });
  it("maps B20 PolicyForbids (not in the router ABI) via raw data", () => {
    const data = encodeErrorResult({ abi: guard, errorName: "PolicyForbids", args: [`0x${"00".repeat(32)}`, 1n] });
    expect(describeTxErrorCore(revertErr(data))).toMatch(/transfer policy/);
  });
  it("maps StaleFeed", () => {
    const data = encodeErrorResult({ abi: guard, errorName: "StaleFeed", args: [FEED, 1n] });
    expect(describeTxErrorCore(revertErr(data))).toMatch(/stale/i);
  });
  it("maps RedeemIncomplete to the in-kind exit", () => {
    const data = encodeErrorResult({ abi: alloyRouterAbi, errorName: "RedeemIncomplete", args: [1n] });
    expect(describeTxErrorCore(revertErr(data))).toMatch(/Withdraw/);
  });
  it("maps faucet CoolingDown with a time", () => {
    const data = encodeErrorResult({ abi: faucetAbi, errorName: "CoolingDown", args: [1_795_100_000n] });
    const d = decodeRevertData(data)!;
    expect(messageForError(d)).toMatch(/Next claim: .*2026/);
  });
  it("maps wallet rejection", () => {
    const e = new BaseError("x", { cause: new UserRejectedRequestError(new Error("rejected")) });
    expect(describeTxErrorCore(e)).toMatch(/rejected/);
  });
  it("maps Error(string) slippage reasons from Uniswap", () => {
    expect(messageForError({ name: "Error", args: ["Too little received"] })).toMatch(/slippage/);
  });
  it("every mapped error name exists in the combined ABI or is a known alias", () => {
    const names = new Set(allErrorsAbi.map((e) => (e as { name: string }).name));
    for (const n of ["StaleFeed", "PolicyForbids", "InsufficientShares", "InsufficientUsdc", "TvlCapExceeded", "CoolingDown", "NotCreator"]) {
      expect(names.has(n)).toBe(true);
    }
  });
});

describe("builderDataSuffix", () => {
  it("encodes ERC-8021 schema 0", () => {
    expect(builderDataSuffix(["alloy"])).toBe("0x616c6c6f79050080218021802180218021802180218021");
  });
});
