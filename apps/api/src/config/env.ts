import { z } from "zod";

export const SUPPORTED_CHAIN_IDS = [8453, 84532] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

const csv = (value: string) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const optionalUrl = optionalString.pipe(z.url().optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, "must be a mongodb:// or mongodb+srv:// URI"),
  RPC_URL_BASE: optionalUrl,
  RPC_URL_BASE_SEPOLIA: optionalUrl,
  CHAIN_IDS: z
    .string()
    .default("8453")
    .transform(csv)
    .pipe(
      z
        .array(
          z
            .string()
            .regex(/^\d+$/, "chain ids must be integers")
            .transform(Number)
            .refine((n): n is SupportedChainId => (SUPPORTED_CHAIN_IDS as readonly number[]).includes(n), {
              message: `chain id must be one of ${SUPPORTED_CHAIN_IDS.join(", ")}`,
            }),
        )
        .min(1),
    )
    .transform((ids) => ids as SupportedChainId[]),
  ALLOWED_ORIGINS: z.string().transform(csv).pipe(z.array(z.url()).min(1)),
  PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  INVITE_CODES: z.string().default("").transform(csv),
  CRON_SECRET: optionalString.pipe(z.string().min(32).optional()),
  /** Header `x-admin-key` for /admin/* (allow list, waitlist export). Unset = admin endpoints answer 503. */
  ADMIN_KEY: optionalString.pipe(z.string().min(24).optional()),
  /**
   * Base Sepolia relayer key for POST /faucet/drip (pays gas for Faucet.dripTo). Testnet only,
   * holds only test ETH. Unset = the faucet endpoint returns 501.
   */
  RELAYER_PK: optionalString.pipe(
    z
      .string()
      .regex(/^0x[0-9a-fA-F]{64}$/, "must be a 0x-prefixed 32-byte hex private key")
      .transform((v) => v as `0x${string}`)
      .optional(),
  ),
  /** Max block range per eth_getLogs call (public sepolia.base.org allows 200). Used for follower counts. */
  RPC_LOGS_MAX_RANGE: z.coerce.number().int().min(1).max(1_000_000).default(200),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse and validate environment variables. Throws an error that names the
 * offending variables but never echoes their values.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
