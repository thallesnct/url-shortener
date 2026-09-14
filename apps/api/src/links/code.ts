import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 7;

// Bytes at or above this are rejected so every character is equally likely (256 % 62 !== 0).
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

export type CodeGenerator = () => string;

export function generateCode(): string {
  let code = '';
  while (code.length < CODE_LENGTH) {
    for (const byte of crypto.randomBytes(CODE_LENGTH - code.length)) {
      if (byte < UNBIASED_LIMIT) code += ALPHABET.charAt(byte % ALPHABET.length);
    }
  }
  return code;
}
