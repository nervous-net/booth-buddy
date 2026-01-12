import { Router } from 'express';
import { prisma } from '../../index';
import { verifyShopifySession } from './middleware';
import { csrfTokenMiddleware } from '../../middleware/csrf';
import { asyncHandler, errors } from '../../middleware/error-handler';
import eventsRouter from './events';

const router = Router();

/**
 * GET /admin - Dashboard showing all events for the shop
 */
router.get('/', verifyShopifySession, csrfTokenMiddleware, asyncHandler(async (req, res) => {
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

  res.render('admin/dashboard', {
    title: 'Booth Buddy Dashboard',
    shopDomain: req.shop,
    events,
    csrfToken: req.csrfToken,
  });
}));

// Mount events routes
router.use('/', eventsRouter);

export default router;
