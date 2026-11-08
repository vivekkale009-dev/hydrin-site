
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

function getEncryptionKey(): Buffer {
  const key = process.env.QR_PIN_ENCRYPTION_KEY;

  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error(
      "QR_PIN_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters."
    );
  }

  return Buffer.from(key, "hex");
}

export function encryptPin(pin: string): string {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(pin, "utf8"),
    cipher.final(),
  ]);

  const authenticationTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authenticationTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptPin(encryptedValue: string): string {
  const parts = encryptedValue.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted PIN format.");
  }

  const [ivHex, tagHex, encryptedHex] = parts;

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
