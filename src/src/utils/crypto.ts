const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveKey(address: string): Promise<CryptoKey> {
  const normalized = address.trim().toLowerCase();
  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(normalized));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptWithAddress(plaintext: string, address: string): Promise<string> {
  const key = await deriveKey(address);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(plaintext);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));
  const tag = encrypted.slice(encrypted.length - 16);
  const data = encrypted.slice(0, encrypted.length - 16);

  return `${toHex(iv)}:${toHex(tag)}:${toHex(data)}`;
}

export async function decryptWithAddress(payload: string, address: string): Promise<string> {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid payload format");
  }
  const key = await deriveKey(address);
  const iv = fromHex(ivHex);
  const tag = fromHex(tagHex);
  const data = fromHex(dataHex);
  const combined = new Uint8Array(data.length + tag.length);
  combined.set(data);
  combined.set(tag, data.length);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return textDecoder.decode(decrypted);
}
