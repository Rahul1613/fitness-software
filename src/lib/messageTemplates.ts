export function cleanIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function isValidIndianMobile(phone: string): boolean {
  const clean = cleanIndianPhone(phone);
  return /^[6-9]\d{9}$/.test(clean);
}

export interface FormatTemplateParams {
  name: string;
  amount?: number | string;
  due_date?: string;
  gym_name?: string;
  days_left?: number | string;
  member_code?: string;
}

export function formatTemplate(template: string, params: FormatTemplateParams): string {
  return template
    .replace(/\{name\}/g, params.name || '')
    .replace(/\{amount\}/g, String(params.amount ?? ''))
    .replace(/\{due_date\}/g, params.due_date || '')
    .replace(/\{gym_name\}/g, params.gym_name || 'AIM Fitness')
    .replace(/\{days_left\}/g, String(params.days_left ?? '0'))
    .replace(/\{member_code\}/g, params.member_code || '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = cleanIndianPhone(phone);
  return `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`;
}

export function buildSmsUrl(phone: string, message: string): string {
  const clean = cleanIndianPhone(phone);
  // Works cross-platform for iOS and Android
  return `sms:+91${clean}?body=${encodeURIComponent(message)}`;
}

export function buildCallUrl(phone: string): string {
  const clean = cleanIndianPhone(phone);
  return `tel:+91${clean}`;
}
