import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Shop domain validation schema
const shopDomainSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9-]+\.myshopify\.com$/, 'Invalid Shopify domain format');

/**
 * Middleware to verify the request has a valid shop parameter
 */
export async function verifyShopifySession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(401).send('Unauthorized - No shop parameter');
  }

  // Validate shop domain format
  const result = shopDomainSchema.safeParse(shop);
  if (!result.success) {
    return res.status(400).send('Invalid shop domain format');
  }

  req.shop = shop;
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      shop?: string;
    }
  }
}
