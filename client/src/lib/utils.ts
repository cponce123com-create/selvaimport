import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDiscountPercent(price: string | number, offerPrice: string | number | null | undefined): number | null {
  if (!offerPrice) return null;
  const p = Number(price);
  const op = Number(offerPrice);
  if (op <= 0 || op >= p || p <= 0) return null;
  return Math.round(((p - op) / p) * 100);
}

export function getDisplayPrice(product: { price: string; offerPrice?: string | null; isOffer?: boolean | null }): { current: number; original: number | null; discount: number | null } {
  const price = Number(product.price);
  if (product.isOffer && product.offerPrice) {
    const offer = Number(product.offerPrice);
    if (offer > 0 && offer < price) {
      return { current: offer, original: price, discount: Math.round(((price - offer) / price) * 100) };
    }
  }
  return { current: price, original: null, discount: null };
}

export function toWebP(url: string | null | undefined, width?: number): string {
  if (!url) return "";
  if (url.includes("res.cloudinary.com")) {
    let transform = "f_auto,q_auto";
    if (width) transform += `,w_${width},c_limit`;
    return url.replace("/upload/", `/upload/${transform}/`);
  }
  if (url.includes("images.unsplash.com")) {
    const sep = url.includes("?") ? "&" : "?";
    let params = `fm=webp&q=80`;
    if (width) params += `&w=${width}`;
    return `${url}${sep}${params}`;
  }
  return url;
}
