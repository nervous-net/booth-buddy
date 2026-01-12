import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { createShopifyClient } from '../services/shopify';
import { asyncHandler } from '../middleware/error-handler';
import { csrfTokenMiddleware, csrfProtection } from '../middleware/csrf';

const router = Router();

// Email validation schema
const emailSchema = z.string().email('Please enter a valid email address');

/**
 * GET /scan/:slug - Display the email capture form
 */
router.get('/:slug', csrfTokenMiddleware, asyncHandler(async (req, res) => {
  const { slug } = req.params;

  // Find event by slug
  const event = await prisma.event.findFirst({
    where: { slug },
    include: { shop: true },
  });

  if (!event) {
    return res.status(404).render('scan/not-found', {
      title: 'Event Not Found',
    });
  }

  // Check if event is active
  if (!event.isActive) {
    return res.render('scan/inactive', {
      title: 'Event Inactive',
      eventName: event.name,
    });
  }

  // Check if event has time restrictions
  const now = new Date();
  if (event.startsAt && now < event.startsAt) {
    return res.render('scan/not-started', {
      title: 'Event Not Started',
      eventName: event.name,
      startsAt: event.startsAt,
    });
  }
  if (event.endsAt && now > event.endsAt) {
    return res.render('scan/ended', {
      title: 'Event Ended',
      eventName: event.name,
    });
  }

  res.render('scan/form', {
    title: event.name,
    eventName: event.name,
    csrfToken: req.csrfToken,
    error: null,
  });
}));

/**
 * POST /scan/:slug - Handle email submission
 */
router.post('/:slug', csrfProtection, asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { email } = req.body;

  // Validate email
  const emailResult = emailSchema.safeParse(email);
  if (!emailResult.success) {
    const event = await prisma.event.findFirst({ where: { slug } });
    return res.status(400).render('scan/form', {
      title: event?.name || 'Sign Up',
      eventName: event?.name || 'Event',
      csrfToken: req.csrfToken,
      error: 'Please enter a valid email address',
    });
  }

  const normalizedEmail = emailResult.data.toLowerCase().trim();

  // Find event with shop
  const event = await prisma.event.findFirst({
    where: { slug },
    include: { shop: true },
  });

  if (!event) {
    return res.status(404).render('scan/not-found', {
      title: 'Event Not Found',
    });
  }

  // Check if event is still active and within time window
  if (!event.isActive) {
    return res.render('scan/inactive', {
      title: 'Event Inactive',
      eventName: event.name,
    });
  }

  const now = new Date();
  if ((event.startsAt && now < event.startsAt) || (event.endsAt && now > event.endsAt)) {
    return res.render('scan/ended', {
      title: 'Event Ended',
      eventName: event.name,
    });
  }

  // Check if email already scanned for this event
  const existingScan = await prisma.eventScan.findUnique({
    where: { eventId_email: { eventId: event.id, email: normalizedEmail } },
  });

  if (existingScan) {
    return res.render('scan/already-registered', {
      title: 'Already Registered',
      eventName: event.name,
    });
  }

  // Create Shopify client
  const shopifyClient = createShopifyClient(event.shop.shopDomain, event.shop.accessToken);

  // Find or create customer in Shopify
  let customerId: string;
  let wasNewCustomer = false;

  try {
    const existingCustomer = await shopifyClient.findCustomerByEmail(normalizedEmail);

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Add tag to existing customer
      await shopifyClient.addTagsToCustomer(customerId, [event.tag]);
    } else {
      // Create new customer with tag
      const newCustomer = await shopifyClient.createCustomerWithTags({
        email: normalizedEmail,
        tags: [event.tag],
      });
      customerId = newCustomer.id;
      wasNewCustomer = true;
    }
  } catch (error) {
    console.error('Shopify API error:', error);
    return res.status(500).render('scan/error', {
      title: 'Error',
      eventName: event.name,
      message: 'Unable to process your registration. Please try again.',
    });
  }

  // Get IP address for tracking
  const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || null;

  // Record the scan
  await prisma.eventScan.create({
    data: {
      shopId: event.shopId,
      eventId: event.id,
      email: normalizedEmail,
      shopifyCustomerId: customerId,
      wasNewCustomer,
      ipAddress,
    },
  });

  console.log(`Scan recorded: ${normalizedEmail} for event ${event.name} (${wasNewCustomer ? 'new' : 'existing'} customer)`);

  res.render('scan/success', {
    title: 'Success!',
    eventName: event.name,
  });
}));

export default router;
