export function cleanPhoneNumber(number: string): string {
  let cleaned = number.replace("@c.us", "");

  cleaned = cleaned.replace(/[^0-9]/g, "");

  if (cleaned.startsWith("08")) {
    cleaned = "62" + cleaned.substring(1);
  }

  if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }

  return cleaned;
}

export function formatToWhatsAppNumber(number: string): string {
  return `${cleanPhoneNumber(number)}@c.us`;
}
