export async function hashAppPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`tgdrive_pin_salt_${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
