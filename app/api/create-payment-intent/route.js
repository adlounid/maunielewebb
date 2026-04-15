import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getProductMap } from "../../../lib/getProducts";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const SHIPPING_FEE = 49;
const FREE_SHIPPING_LIMIT = 900;

function createOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MAU-${timestamp}-${randomPart}`;
}

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY saknas på servern." }, { status: 500 });
    }

    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Kundvagnen är tom." }, { status: 400 });
    }

    const productMap = getProductMap();
    const subtotal = items.reduce((sum, item) => {
      const product = productMap.get(item.id);
      const quantity = Number(item.quantity) || 0;
      if (!product || quantity <= 0) {
        return sum;
      }
      return sum + product.price * quantity;
    }, 0);

    if (subtotal <= 0) {
      return NextResponse.json({ error: "Inga giltiga produkter kunde räknas i kassan." }, { status: 400 });
    }

    const shipping = subtotal >= FREE_SHIPPING_LIMIT ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;
    const orderItems = items
      .map((item) => {
        const product = productMap.get(item.id);
        const quantity = Number(item.quantity) || 0;
        if (!product || quantity <= 0) {
          return null;
        }
        return `${product.name} x${quantity}`;
      })
      .filter(Boolean);
    const orderSummary = orderItems.join(", ");
    const productIds = items
      .map((item) => {
        const product = productMap.get(item.id);
        const quantity = Number(item.quantity) || 0;
        if (!product || quantity <= 0) {
          return null;
        }
        return `${product.id}:${quantity}`;
      })
      .filter(Boolean)
      .join(",");
    const orderNumber = createOrderNumber();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total * 100,
      currency: "sek",
      payment_method_types: ["card", "klarna", "amazon_pay", "link"],
      description: orderSummary || "Beställning från Mauniele",
      metadata: {
        order_number: orderNumber,
        subtotal: String(subtotal),
        shipping: String(shipping),
        item_count: String(items.length),
        order_items: orderSummary || "Okänd order",
        product_ids: productIds || "Okända produkter",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderNumber,
      subtotal,
      shipping,
      total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Något gick fel hos Stripe.";
    console.error("Stripe error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
