import { toArrayBuffer } from "./cast";

export async function deriveKeyFromPassword(password: string, salt: Uint8Array) {
  const pwUtf8 = new TextEncoder().encode(password);
  const keyMaterial = await window.crypto.subtle.importKey("raw", toArrayBuffer(pwUtf8), { name: "PBKDF2" }, false, [
    "deriveKey",
  ]);
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(key: CryptoKey, data: Uint8Array) {
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(ivBytes) },
    key,
    toArrayBuffer(data)
  );
  return { iv: Array.from(ivBytes), ciphertext: Array.from(new Uint8Array(ciphertext)) };
}

export async function decryptData(key: CryptoKey, iv: Uint8Array, ciphertext: Uint8Array) {
  const plain = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext)
  );
  return new Uint8Array(plain);
}
