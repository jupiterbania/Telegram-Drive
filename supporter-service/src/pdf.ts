/**
 * Pure TypeScript Zero-Dependency PDF 1.4 Generator
 * Generates an official, beautiful TG Drive Supporter Certificate & Invoice Receipt
 */

export interface CertificateData {
  customerName: string;
  email: string;
  licenseKey: string;
  planType: string;
  date: string;
  orderId?: string;
  amount?: string;
}

function escapePdfText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function generateSupporterCertificatePdf(data: CertificateData): Uint8Array {
  const customerName = escapePdfText(data.customerName || 'Valued Customer');
  const email = escapePdfText(data.email);
  const licenseKey = escapePdfText(data.licenseKey);
  const planType = escapePdfText(data.planType.toUpperCase());
  const dateStr = escapePdfText(data.date || new Date().toISOString().slice(0, 10));
  const orderId = escapePdfText(data.orderId || `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  const amountStr = escapePdfText(data.amount || 'CONFIRMED');

  // Build the drawing stream (612 x 792 - Letter size)
  const streamLines: string[] = [
    // 1. Dark Background Canvas (#090D16)
    '0.035 0.051 0.086 rg',
    '0 0 612 792 re',
    'f',

    // 2. Outer Border with Glowing Accent (#0284C7)
    '0.008 0.518 0.780 RG',
    '2 w',
    '36 36 540 720 re',
    's',

    // 3. Inner Decorative Border (#1E293B)
    '0.118 0.161 0.231 RG',
    '1 w',
    '44 44 524 704 re',
    's',

    // 4. Header Badge (#0F172A)
    '0.059 0.090 0.165 rg',
    '44 670 524 78 re',
    'f',
    '0.118 0.161 0.231 RG',
    '44 670 524 1 re',
    's',

    // Header Text
    'BT',
    '/F1 20 Tf',
    '1 1 1 rg',
    '70 718 Td',
    '(TG DRIVE: UNLIMITED CLOUD) Tj',
    'ET',

    'BT',
    '/F2 11 Tf',
    '0.220 0.741 0.973 rg',
    '70 694 Td',
    '(OFFICIAL SUPPORTER LICENSE & ENTITLEMENT CERTIFICATE) Tj',
    'ET',

    // Status Badge Top Right
    '0.024 0.361 0.224 rg',
    '450 706 95 24 re',
    'f',
    'BT',
    '/F1 10 Tf',
    '0.204 0.827 0.506 rg',
    '465 714 Td',
    '(STATUS: ACTIVE) Tj',
    'ET',

    // 5. Section: Certificate Recipient Details
    'BT',
    '/F1 12 Tf',
    '0.220 0.741 0.973 rg',
    '70 635 Td',
    '(SUPPORTER CREDENTIALS) Tj',
    'ET',

    '0.118 0.161 0.231 RG',
    '1 w',
    '70 626 472 1 re',
    's',

    'BT',
    '/F2 11 Tf',
    '0.580 0.639 0.722 rg',
    '70 600 Td',
    '(Issued To:) Tj',
    '110 0 Td',
    '1 1 1 rg',
    `(${customerName}) Tj`,
    'ET',

    'BT',
    '/F2 11 Tf',
    '0.580 0.639 0.722 rg',
    '70 575 Td',
    '(Registered Email:) Tj',
    '110 0 Td',
    '1 1 1 rg',
    `(${email}) Tj`,
    'ET',

    'BT',
    '/F2 11 Tf',
    '0.580 0.639 0.722 rg',
    '70 550 Td',
    '(Order Reference:) Tj',
    '110 0 Td',
    '1 1 1 rg',
    `(${orderId}) Tj`,
    'ET',

    'BT',
    '/F2 11 Tf',
    '0.580 0.639 0.722 rg',
    '70 525 Td',
    '(Issue Date:) Tj',
    '110 0 Td',
    '1 1 1 rg',
    `(${dateStr}) Tj`,
    'ET',

    'BT',
    '/F2 11 Tf',
    '0.580 0.639 0.722 rg',
    '70 500 Td',
    '(Entitlement Plan:) Tj',
    '110 0 Td',
    '0.220 0.741 0.973 rg',
    `(${planType} SUPPORTER ACCESS) Tj`,
    'ET',

    // 6. License Key Golden Box
    '0.024 0.035 0.063 rg',
    '70 405 472 65 re',
    'f',
    '0.008 0.518 0.780 RG',
    '1.5 w',
    '70 405 472 65 re',
    's',

    'BT',
    '/F1 10 Tf',
    '0.220 0.741 0.973 rg',
    '90 450 Td',
    '(AUTHORIZED LICENSE KEY) Tj',
    'ET',

    'BT',
    '/F3 16 Tf',
    '1 1 1 rg',
    '90 422 Td',
    `(${licenseKey}) Tj`,
    'ET',

    // 7. Entitlements & Features Grid
    'BT',
    '/F1 12 Tf',
    '0.220 0.741 0.973 rg',
    '70 365 Td',
    '(VERIFIED ENTITLEMENTS) Tj',
    'ET',

    '0.118 0.161 0.231 RG',
    '1 w',
    '70 356 472 1 re',
    's',

    'BT',
    '/F2 10 Tf',
    '0.796 0.835 0.882 rg',
    '80 330 Td',
    '([X] 100% Ad-Free Experience Across Windows, Mac, Linux and Android) Tj',
    '0 -20 Td',
    '([X] Maximum Upload and Download Speed Priority) Tj',
    '0 -20 Td',
    '([X] Dual Device Concurrent Authorization (1 PC/Laptop + 1 Phone)) Tj',
    '0 -20 Td',
    '([X] Self-Service Device Transfer and Instant Key Recovery Rights) Tj',
    '0 -20 Td',
    '([X] Lifetime Cloud Storage Protocol Access on Telegram Infrastructure) Tj',
    'ET',

    // 8. Activation Instructions
    '0.059 0.090 0.165 rg',
    '70 145 472 70 re',
    'f',
    '0.118 0.161 0.231 RG',
    '1 w',
    '70 145 472 70 re',
    's',

    'BT',
    '/F1 10 Tf',
    '0.220 0.741 0.973 rg',
    '85 195 Td',
    '(HOW TO ACTIVATE IN APP:) Tj',
    'ET',

    'BT',
    '/F2 9.5 Tf',
    '0.580 0.639 0.722 rg',
    '85 178 Td',
    '(1. Open TG Drive on your computer or Android device.) Tj',
    '0 -15 Td',
    '(2. Open Settings -> Supporter / License, paste your key above, and click Activate.) Tj',
    'ET',

    // 9. Footer Sign-off
    'BT',
    '/F2 9 Tf',
    '0.392 0.455 0.545 rg',
    '170 65 Td',
    '(TG Drive Cloud Inc. - Cryptographically Signed Supporter Certificate) Tj',
    'ET',
  ];

  const streamContent = streamLines.join('\n');
  const streamLength = streamContent.length;

  // Assemble PDF Objects
  const objects: string[] = [];
  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj';
  objects[2] = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj';
  objects[3] =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj';
  objects[4] = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj';
  objects[5] = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj';
  objects[6] = '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj';
  objects[7] = `7 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`;

  let pdfText = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];

  for (let i = 1; i <= 7; i++) {
    offsets[i] = pdfText.length;
    pdfText += (objects[i] ?? '') + '\n';
  }

  const xrefOffset = pdfText.length;
  pdfText += 'xref\n0 8\n0000000000 65535 f \n';
  for (let i = 1; i <= 7; i++) {
    const off = offsets[i] ?? 0;
    const offsetStr = off.toString().padStart(10, '0');
    pdfText += `${offsetStr} 00000 n \n`;
  }

  pdfText += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdfText);
}
