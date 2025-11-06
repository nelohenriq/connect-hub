import { NextRequest, NextResponse } from 'next/server';
import { premiumService } from '@/lib/premium';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await premiumService.handlePaymentSuccess(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
        // Handle successful subscription payment
        break;

      case 'customer.subscription.created':
        // Handle new subscription
        break;

      case 'customer.subscription.updated':
        // Handle subscription changes
        break;

      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        break;

      case 'payment_intent.payment_failed':
        // Handle failed payment
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}