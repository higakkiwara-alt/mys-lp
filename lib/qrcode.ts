export function buildQrUrl(data: string, size = 200): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png&color=B8975A&bgcolor=FFFFFF`;
}

export function buildReviewQr(placeId: string, size = 200): string {
  const url = `https://search.google.com/local/writereview?placeid=${placeId}`;
  return buildQrUrl(url, size);
}

export function buildLineQr(lineId: string, size = 200): string {
  const url = `https://line.me/R/ti/p/${lineId}`;
  return buildQrUrl(url, size);
}

export function buildBookingQr(bookingUrl: string, size = 200): string {
  return buildQrUrl(bookingUrl, size);
}

export type QrSet = {
  review: string;
  line: string;
  booking: string;
};

export function generateQrSet(opts: {
  placeId: string;
  lineId: string;
  bookingUrl: string;
  size?: number;
}): QrSet {
  return {
    review: buildReviewQr(opts.placeId, opts.size),
    line: buildLineQr(opts.lineId, opts.size),
    booking: buildBookingQr(opts.bookingUrl, opts.size),
  };
}
