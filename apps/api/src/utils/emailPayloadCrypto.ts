
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const value = process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY;

  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('EMAIL_PAYLOAD_ENCRYPTION_KEY_INVALID');
  }

  return Buffer.from(value, 'hex');
}

export function encryptEmailPayload(
  payload: { text: string; html?: string },
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);

  return {
    kind: 'encrypted-v1',
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

export function decryptEmailPayload(payload: Record<string, unknown>): {
  text: string;
  html?: string;
} {
  if (
    payload.kind !== 'encrypted-v1' ||
    typeof payload.iv !== 'string' ||
    typeof payload.authTag !== 'string' ||
    typeof payload.ciphertext !== 'string'
  ) {
    throw new Error('EMAIL_ENCRYPTED_PAYLOAD_INVALID');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.iv, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(payload.ciphertext, 'hex'),
    ),
    decipher.final(),
  ]).toString('utf8');

  const result = JSON.parse(decrypted) as {
    text?: unknown;
    html?: unknown;
  };

  if (typeof result.text !== 'string' || !result.text) {
    throw new Error('EMAIL_DECRYPTED_PAYLOAD_INVALID');
  }

  return {
    text: result.text,
    ...(typeof result.html === 'string'
      ? { html: result.html }
      : {}),
  };
}
