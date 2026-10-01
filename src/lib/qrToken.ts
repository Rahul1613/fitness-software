/**
 * Secure QR Token Generator and Offline Validator for AIM Fitness
 * Format: AIM1.<gym_id>.<member_id>.<issued_at_epoch>.<hmac_hex>
 *
 * Verification runs completely offline on-device by checking the HMAC
 * against the gym's stored qr_secret.
 */

// Simple hex encoder
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Compute HMAC-SHA256 using Web Crypto API
async function computeHmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bufferToHex(signature).substring(0, 16); // 16-char hex truncation for compact QR
}

export interface QrTokenPayload {
  version: 'AIM1';
  gym_id: string;
  member_id: string;
  issued_at: number;
}

export async function generateQrToken(
  gymId: string,
  memberId: string,
  qrSecret: string = 'aim_secret_ratnagiri_key_2026'
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const dataToSign = `AIM1.${gymId}.${memberId}.${issuedAt}`;
  const hmac = await computeHmac(qrSecret, dataToSign);
  return `${dataToSign}.${hmac}`;
}

export interface VerifyQrResult {
  isValid: boolean;
  memberId?: string;
  gymId?: string;
  issuedAt?: number;
  error?: 'MALFORMED' | 'GYM_MISMATCH' | 'FORGED_SIGNATURE';
}

export async function verifyQrToken(
  token: string,
  expectedGymId: string,
  qrSecret: string = 'aim_secret_ratnagiri_key_2026'
): Promise<VerifyQrResult> {
  if (!token || typeof token !== 'string') {
    return { isValid: false, error: 'MALFORMED' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 5 || parts[0] !== 'AIM1') {
    return { isValid: false, error: 'MALFORMED' };
  }

  const [version, gymId, memberId, issuedAtStr, signature] = parts;

  // Verify Gym Match
  if (gymId !== expectedGymId) {
    return { isValid: false, error: 'GYM_MISMATCH' };
  }

  // Verify Cryptographic Signature
  const dataToSign = `${version}.${gymId}.${memberId}.${issuedAtStr}`;
  const expectedHmac = await computeHmac(qrSecret, dataToSign);

  if (signature !== expectedHmac) {
    return { isValid: false, error: 'FORGED_SIGNATURE' };
  }

  return {
    isValid: true,
    gymId,
    memberId,
    issuedAt: parseInt(issuedAtStr, 10),
  };
}
