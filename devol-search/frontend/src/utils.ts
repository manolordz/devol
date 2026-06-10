import type { ProductResult } from "./types";

export const JPY_TO_MXN = 0.115;

/** Stable unique key for a product result, used for selection tracking. */
export function productKey(product: ProductResult): string {
  return `${product.store_id}::${product.url}`;
}
