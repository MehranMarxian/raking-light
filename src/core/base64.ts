/** Base64 for bytes, without relying on btoa/atob or Buffer, so it runs in workers, tests and Node. */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Map(Array.from({ length: 64 }, (_, i) => [ALPHABET.charAt(i), i]));

export function encodeBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]!;
    out += b === undefined ? "=" : ALPHABET[(n >> 6) & 63]!;
    out += c === undefined ? "=" : ALPHABET[n & 63]!;
  }
  return out;
}

export function decodeBase64(text: string): Uint8Array {
  const clean = text.replace(/\s+/g, "");
  if (clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(clean) || /=[^=]/.test(clean)) {
    throw new Error("Not valid base64");
  }
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const out = new Uint8Array((clean.length / 4) * 3 - padding);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      ((LOOKUP.get(clean[i]!) ?? 0) << 18) |
      ((LOOKUP.get(clean[i + 1]!) ?? 0) << 12) |
      ((LOOKUP.get(clean[i + 2]!) ?? 0) << 6) |
      (LOOKUP.get(clean[i + 3]!) ?? 0);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}
