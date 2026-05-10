/** Minimal cross-connector order shape for Woo ↔ Exact (Phase 2: Woo fields). */
export interface CanonicalOrder {
  id: string;
  number?: string;
  status?: string;
  currency?: string;
  total?: string;
  dateCreated?: string;
  dateModified?: string;
  customerId?: string | null;
  lineItems?: CanonicalOrderLineItem[];
}

export interface CanonicalOrderLineItem {
  id?: string;
  productId?: string | null;
  variationId?: string | null;
  quantity?: number;
  subtotal?: string;
  total?: string;
  sku?: string | null;
}

export interface CanonicalProduct {
  id: string;
  sku?: string;
  name?: string;
  status?: string;
  type?: string;
  regularPrice?: string;
  salePrice?: string;
  stockQuantity?: number | null;
  stockStatus?: string;
  manageStock?: boolean;
  dateModified?: string;
}

export interface CanonicalCustomer {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/** Stock change anchored on a product (Woo stores stock on the product). */
export interface CanonicalStock {
  productId: string;
  quantity: number | null;
  stockStatus?: string;
  manageStock?: boolean;
}

export interface CanonicalPrice {
  productId: string;
  regularPrice?: string;
  salePrice?: string;
}

export interface CanonicalRefund {
  id: string;
  orderId: string;
  amount?: string;
  reason?: string | null;
}

export type CanonicalByKind = {
  order: CanonicalOrder;
  product: CanonicalProduct;
  customer: CanonicalCustomer;
  stock: CanonicalStock;
  price: CanonicalPrice;
  refund: CanonicalRefund;
};

export type CanonicalEntity<K extends keyof CanonicalByKind> = CanonicalByKind[K];
