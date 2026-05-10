import sodium from "libsodium-wrappers";

let sodiumReady: Promise<void> | null = null;

async function ensureSodium(): Promise<void> {
  if (!sodiumReady) sodiumReady = sodium.ready;
  await sodiumReady;
}

function parseKeyHex(hex: string): Uint8Array {
  const clean = hex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(
      "SECRETS_KEY must be 64 hex chars (32 bytes) for libsodium secretbox",
    );
  }
  return sodium.from_hex(clean);
}

/** Encrypt arbitrary UTF-8 JSON-serializable payloads for connector_secrets rows. */
export async function encryptSecretJson(payload: unknown): Promise<{
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}> {
  await ensureSodium();
  const key = parseKeyHex(requiredEnv("SECRETS_KEY"));
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = sodium.crypto_secretbox_easy(plain, nonce, key);
  return { ciphertext, nonce };
}

export async function decryptSecretJson<T = unknown>(input: {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}): Promise<T> {
  await ensureSodium();
  const key = parseKeyHex(requiredEnv("SECRETS_KEY"));
  const opened = sodium.crypto_secretbox_open_easy(
    input.ciphertext,
    input.nonce,
    key,
  );
  if (!opened) {
    throw new Error("Failed to decrypt secret (wrong key or corrupt payload)");
  }
  return JSON.parse(new TextDecoder().decode(opened)) as T;
}

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
