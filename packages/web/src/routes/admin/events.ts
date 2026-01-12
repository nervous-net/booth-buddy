import { Router } from 'express';
import { prisma } from '../../index';
import { verifyShopifySession } from './middleware';
import { csrfTokenMiddleware, csrfProtection } from '../../middleware/csrf';
import { asyncHandler, errors } from '../../middleware/error-handler';
import { generateQRCode, buildScanUrl, slugify, sanitizeTag } from '../../services/qrcode';

const router = Router();

/**
 * GET /admin/events - List all events for the shop
 */
router.get('/events', verifyShopifySession, asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: req.shop },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { scans: true } },
        },
      },
    },
  });

  if (!shop) {
    throw errors.shopNotFound(req.shop);
  }

  const events = shop.events.map(event => ({
    id: event.id,
    name: event.name,
    slug: event.slug,
    tag: event.tag,
    isActive: event.isActive,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    scanCount: event._count.scans,
    createdAt: event.createdAt,
  }));

  res.json({ events });
}));

/**
 * POST /admin/events - Create a new event
 */
router.post('/events', verifyShopifySession, csrfProtection, asyncHandler(async (req, res) => {
  const { name, tag, startsAt, endsAt } = req.body;

  if (!name || !tag) {
    throw errors.missingParameter('name and tag are required');
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: req.shop },
  });

  if (!shop) {
    throw errors.shopNotFound(req.shop);
  }

  // Generate URL-safe slug from name
  const slug = slugify(name);

  // Check for duplicate slug
  const existing = await prisma.event.findUnique({
    where: { shopId_slug: { shopId: shop.id, slug } },
  });

  if (existing) {
    throw errors.alreadyExists('Event with this name');
  }

  const event = await prisma.event.create({
    data: {
      shopId: shop.id,
      name,
      slug,
      tag: sanitizeTag(tag),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  console.log(`✅ Created event: ${event.name} (${event.slug})`);

  res.json({ success: true, event });
}));

/**
 * GET /admin/events/:id - Get event details
 */
router.get('/events/:id', verifyShopifySession, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      shop: true,
      _count: { select: { scans: true } },
    },
  });

  if (!event || event.shop.shopDomain !== req.shop) {
    throw errors.eventNotFound(id);
  }

  res.json({
    event: {
      id: event.id,
      name: event.name,
      slug: event.slug,
      tag: event.tag,
      isActive: event.isActive,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      scanCount: event._count.scans,
      scanUrl: buildScanUrl(event.slug),
      createdAt: event.createdAt,
    },
  });
}));

/**
 * PUT /admin/events/:id - Update an event
 */
router.put('/events/:id', verifyShopifySession, csrfProtection, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, tag, isActive, startsAt, endsAt } = req.body;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { shop: true },
  });

  if (!event || event.shop.shopDomain !== req.shop) {
    throw errors.eventNotFound(id);
  }

  const updatedEvent = await prisma.event.update({
    where: { id },
    data: {
      ...(name && { name, slug: slugify(name) }),
      ...(tag && { tag: sanitizeTag(tag) }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
    },
  });

  console.log(`✅ Updated event: ${updatedEvent.name}`);

  res.json({ success: true, event: updatedEvent });
}));

/**
 * DELETE /admin/events/:id - Delete an event
 */
router.delete('/events/:id', verifyShopifySession, csrfProtection, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { shop: true },
  });

  if (!event || event.shop.shopDomain !== req.shop) {
    throw errors.eventNotFound(id);
  }

  await prisma.event.delete({ where: { id } });

  console.log(`🗑️ Deleted event: ${event.name}`);

  res.json({ success: true });
}));

/**
 * GET /admin/events/:id/qr - Download QR code
 */
router.get('/events/:id/qr', verifyShopifySession, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const format = req.query.format === 'svg' ? 'svg' : 'png';

  const event = await prisma.event.findUnique({
    where: { id },
    include: { shop: true },
  });

  if (!event || event.shop.shopDomain !== req.shop) {
    throw errors.eventNotFound(id);
  }

  const scanUrl = buildScanUrl(event.slug);
  const qrCode = await generateQRCode(scanUrl, { format, size: 400 });

  if (format === 'svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-qr.svg"`);
  } else {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-qr.png"`);
  }

  res.send(qrCode);
}));

/**
 * GET /admin/events/:id/scans - List scans for an event
 */
router.get('/events/:id/scans', verifyShopifySession, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { shop: true },
  });

  if (!event || event.shop.shopDomain !== req.shop) {
    throw errors.eventNotFound(id);
  }

  const [scans, total] = await Promise.all([
    prisma.eventScan.findMany({
      where: { eventId: id },
      orderBy: { scannedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.eventScan.count({ where: { eventId: id } }),
  ]);

  res.json({
    scans: scans.map(scan => ({
      id: scan.id,
      email: scan.email,
      shopifyCustomerId: scan.shopifyCustomerId,
      wasNewCustomer: scan.wasNewCustomer,
      scannedAt: scan.scannedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

export default router;
