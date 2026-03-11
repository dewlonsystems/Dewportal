// =============================================================================
// DEWPORTAL FRONTEND - DOWNLOAD UTILITY
// =============================================================================
// src/lib/utils/download.ts
// Client-side helper to trigger a file download from a base64 blob.
// Call this in a Client Component after a server action returns blob data.
// =============================================================================

/**
 * Trigger a browser file download from a base64-encoded string.
 *
 * Usage (in a 'use client' component):
 *
 *   const result = await downloadReceiptAction(transactionId);
 *   if (result.success && result.data) {
 *     downloadBase64File(
 *       result.data.blob,
 *       result.data.filename,
 *       'application/pdf'
 *     );
 *   }
 */
export function downloadBase64File(
  base64: string,
  filename: string,
  mimeType: string
): void {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Convenience wrappers for common file types
 */
export const downloadPdf = (base64: string, filename: string) =>
  downloadBase64File(base64, filename, 'application/pdf');

export const downloadExcel = (base64: string, filename: string) =>
  downloadBase64File(
    base64,
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );