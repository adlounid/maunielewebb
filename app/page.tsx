"use client";

import React, { useEffect, useState } from "react";
import { AddressElement, Elements, ExpressCheckoutElement, LinkAuthenticationElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowRight, CheckCircle2, CreditCard, HeartHandshake, Loader2, Lock, Menu, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Star, X } from "lucide-react";
import { PRODUCTS, Product } from "@/lib/getProducts";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) : null;
const SEK = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });

type PageKey = "home" | "products" | "about" | "contact";
type CheckoutState = "idle" | "loading" | "ready" | "success" | "error";

interface CartItem extends Product {
  quantity: number;
}

interface Summary {
  subtotal: number;
  shipping: number;
  total: number;
}

type DeviceType = "iphone" | "android" | "desktop";

function formatPrice(value: number) {
  return SEK.format(value);
}

function getSummary(cart: CartItem[]): Summary {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 900 || subtotal === 0 ? 0 : 49;
  return { subtotal, shipping, total: subtotal + shipping };
}

function CheckoutForm({
  total,
  cart,
  deviceType,
  onSuccess,
}: {
  total: number;
  cart: CartItem[];
  deviceType: DeviceType;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expressReady, setExpressReady] = useState(false);
  const [walletLabel, setWalletLabel] = useState("");
  const [walletStatusText, setWalletStatusText] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lineItems = cart.map((item) => ({
    name: `${item.name} x${item.quantity}`,
    amount: item.price * item.quantity * 100,
  }));

  async function confirmElementsPayment() {
    if (!stripe || !elements) {
      return null;
    }

    const submitResult = await elements.submit();
    if (submitResult.error) {
      return { error: submitResult.error };
    }

    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}?checkout=complete`
        : undefined;

    return (stripe as any).confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");
    const result = await confirmElementsPayment();
    const stripeError = result?.error;
    const paymentIntent = result?.paymentIntent;
    if (stripeError) {
      setError(stripeError.message || "Betalningen kunde inte genomföras.");
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") onSuccess();
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[28px] border border-[#e8decf] bg-[#fffdfa] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">Snabbkassa</div>
            <div className="mt-1 text-sm text-[#5f4f3f]">
              {walletLabel || "Apple Pay och Google Pay visas när Stripe och enheten stöder det."}
            </div>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className={`rounded-2xl border px-4 py-3 text-sm ${deviceType === "iphone" ? "border-[#1d1a16] bg-[#1d1a16] text-white" : "border-[#e8decf] bg-white text-[#1d1a16]"}`}>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70">Apple Pay</div>
            <div className="mt-1 font-semibold">{deviceType === "iphone" ? "Prioriterad på iPhone" : "Tillgänglig när Safari + Wallet stöds"}</div>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm ${deviceType === "android" ? "border-[#1d1a16] bg-[#1d1a16] text-white" : "border-[#e8decf] bg-white text-[#1d1a16]"}`}>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70">Google Pay</div>
            <div className="mt-1 font-semibold">{deviceType === "android" ? "Prioriterad på Android" : "Tillgänglig när browsern stöder det"}</div>
          </div>
        </div>
        <ExpressCheckoutElement
          options={{
            layout: { maxColumns: 1, maxRows: 2, overflow: "never" },
            paymentMethodOrder: ["apple_pay", "google_pay", "link"],
            wallets: {
              applePay: deviceType === "iphone" ? "always" : "auto",
              googlePay: deviceType === "android" ? "always" : "auto",
            },
          }}
          onReady={(event) => {
            const available = event.availablePaymentMethods;
            const labels = [];
            if (available?.applePay) labels.push("Apple Pay tillgängligt");
            if (available?.googlePay) labels.push("Google Pay tillgängligt");
            setWalletLabel(labels.join(" • "));
            setExpressReady(Boolean(available?.applePay || available?.googlePay));
            if (available?.applePay || available?.googlePay) {
              setWalletStatusText("Snabbbetalning är tillgänglig på den här enheten.");
              return;
            }
            if (deviceType === "iphone") {
              setWalletStatusText("Apple Pay är inte tillgängligt just nu. Kontrollera Safari, Wallet och att domänen är registrerad i Stripe.");
              return;
            }
            if (deviceType === "android") {
              setWalletStatusText("Google Pay är inte tillgängligt just nu. Kontrollera browserstöd och att Google Pay är aktiverat på enheten.");
              return;
            }
            setWalletStatusText("Apple Pay eller Google Pay visas när Stripe och enheten stöder det.");
          }}
          onLoadError={() => {
            setExpressReady(false);
            setWalletLabel("");
            setWalletStatusText("Snabbbetalning kunde inte laddas. Fortsätt med kortbetalning nedan.");
          }}
          onClick={(event) => {
            event.resolve({
              emailRequired: true,
              phoneNumberRequired: true,
              shippingAddressRequired: true,
              allowedShippingCountries: ["SE"],
              lineItems: [
                ...lineItems,
                ...(total > subtotal
                  ? [{ name: "Frakt", amount: (total - subtotal) * 100 }]
                  : []),
              ],
            });
          }}
          onConfirm={async (event) => {
            if (!stripe || !elements) {
              event.paymentFailed();
              return;
            }

            setBusy(true);
            setError("");
            const result = await confirmElementsPayment();
            const stripeError = result?.error;
            const paymentIntent = result?.paymentIntent;
            if (stripeError) {
              setError(stripeError.message || "Snabbbetalningen kunde inte genomföras.");
              event.paymentFailed({ reason: "fail" });
              setBusy(false);
              return;
            }
            if (paymentIntent?.status === "succeeded") {
              onSuccess();
            } else {
              event.paymentFailed({ reason: "fail" });
            }
            setBusy(false);
          }}
        />
        <div className={`mt-3 rounded-2xl px-4 py-3 text-xs leading-6 ${expressReady ? "border border-green-200 bg-green-50 text-green-700" : "border border-[#ead8c4] bg-[#f8f1e7] text-[#8a6d52]"}`}>
          {walletStatusText || "Wallet-betalning visas automatiskt när Apple Pay eller Google Pay stöds på den här enheten."}
        </div>
      </div>
      <div className="rounded-[28px] border border-[#e8decf] bg-[#fffdfa] p-4"><LinkAuthenticationElement /></div>
      <div className="rounded-[28px] border border-[#e8decf] bg-[#fffdfa] p-4"><AddressElement options={{ mode: "shipping" }} /></div>
      <div className="rounded-[28px] border border-[#e8decf] bg-[#fffdfa] p-4">
        <div className="mb-3">
          <div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">Betalsätt</div>
          <div className="mt-1 text-sm text-[#5f4f3f]">Kort, Klarna och Amazon Pay visas här när de är aktiverade i Stripe och tillgängliga för köpet.</div>
        </div>
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card", "klarna", "amazon_pay", "link"],
            wallets: {
              applePay: "never",
              googlePay: "never",
            },
          }}
        />
      </div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={!stripe || !elements || busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1d1a16] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60">
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}Betala {formatPrice(total)}
      </button>
    </form>
  );
}

export default function Home() {
  const [page, setPage] = useState<PageKey>("home");
  const [category, setCategory] = useState<"Alla" | "Dam" | "Herr">("Alla");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [serverSummary, setServerSummary] = useState<Summary | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");

  const filteredProducts = category === "Alla" ? PRODUCTS : PRODUCTS.filter((product) => product.category === category);
  const localSummary = getSummary(cart);
  const summary = serverSummary ?? localSummary;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    document.body.style.overflow = cartOpen || checkoutOpen || selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen, checkoutOpen, selected]);

  useEffect(() => {
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType("iphone");
      return;
    }
    if (/android/.test(userAgent)) {
      setDeviceType("android");
      return;
    }
    setDeviceType("desktop");
  }, []);

  function goTo(next: PageKey) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToProducts() {
    setPage("products");
    setMenuOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setSelected(null);
    setCartOpen(true);
  }

  function updateQuantity(id: string, delta: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0));
  }

  async function startCheckout() {
    if (!cart.length) return;
    setCartOpen(false);
    setCheckoutOpen(true);
    setCheckoutState("loading");
    setCheckoutError("");
    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((item) => ({ id: item.id, quantity: item.quantity })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte starta kassan.");
      setClientSecret(data.clientSecret);
      setServerSummary({ subtotal: data.subtotal, shipping: data.shipping, total: data.total });
      setCheckoutState("ready");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Något gick fel.");
      setCheckoutState("error");
    }
  }

  function completeCheckout() {
    setCheckoutState("success");
    setCart([]);
    setServerSummary(null);
  }

  return (
    <div className="min-h-screen bg-[#f8f1e7] text-[#1d1a16]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-[22rem] w-[22rem] rounded-full bg-[#f3c98b]/30 blur-3xl" />
        <div className="absolute bottom-[-12%] right-[-6%] h-[24rem] w-[24rem] rounded-full bg-[#d08b5d]/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/30 bg-[#f8f1e7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button onClick={() => goTo("home")} className="text-left">
            <div className="font-serif text-xl tracking-[0.22em] sm:text-2xl sm:tracking-[0.28em]">MAUNIELE</div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#8a6d52] sm:text-xs sm:tracking-[0.35em]">Perfume Atelier</div>
          </button>
          <nav className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/60 p-1 md:flex">
            {[["home", "Hem"], ["products", "Kollektion"], ["about", "Om oss"], ["contact", "Kontakta oss"]].map(([key, label]) => (
              <button key={key} onClick={() => goTo(key as PageKey)} className={`rounded-full px-4 py-2 text-sm transition ${page === key ? "bg-[#1d1a16] text-white" : "text-[#6b5844] hover:bg-white"}`}>{label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setCartOpen(true)} className="relative rounded-full border border-[#d9c7b2] bg-white px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 sm:px-4">
              <span className="flex items-center gap-2"><ShoppingBag size={16} /><span className="hidden sm:inline">Kundvagn</span><span className="sm:hidden">Bag</span></span>
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1d1a16] px-1 text-[10px] font-semibold text-white">{cartCount}</span>}
            </button>
            <button onClick={() => setMenuOpen((open) => !open)} className="rounded-full border border-[#d9c7b2] bg-white p-2 md:hidden"><Menu size={20} /></button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#e5d8ca] bg-[#fbf6ef] px-4 py-4 md:hidden">
            <div className="space-y-2">
              <button onClick={() => goTo("home")} className="block w-full rounded-2xl bg-white px-4 py-3 text-left">Hem</button>
              <button onClick={() => goTo("products")} className="block w-full rounded-2xl bg-white px-4 py-3 text-left">Kollektion</button>
              <button onClick={() => goTo("about")} className="block w-full rounded-2xl bg-white px-4 py-3 text-left">Om oss</button>
              <button onClick={() => goTo("contact")} className="block w-full rounded-2xl bg-white px-4 py-3 text-left">Kontakta oss</button>
            </div>
          </div>
        )}
      </header>

      {page === "home" && (
        <>
          <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-16">
            <div className="flex flex-col justify-center">
              <div className="fade-up inline-flex w-fit items-center gap-2 rounded-full border border-[#e6d7c8] bg-white/70 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-[#8a6d52] sm:px-4 sm:text-xs sm:tracking-[0.28em]"><Sparkles size={14} />Curated perfume oils</div>
              <h1 className="fade-up mt-4 max-w-2xl font-serif text-[2.45rem] leading-[0.9] sm:mt-6 sm:text-6xl lg:text-7xl">Dofter skapade för att kännas personliga, varma och minnesvärda.</h1>
              <p className="fade-up mt-4 max-w-xl text-[15px] leading-6 text-[#5f4f3f] sm:mt-6 sm:text-lg sm:leading-7">Upptäck Maunieles utvalda kollektion av parfymoljor för dam och herr.</p>
              <div className="fade-up mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-row">
                <button onClick={scrollToProducts} className="w-full rounded-full bg-[#1d1a16] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-1 sm:w-auto">Handla nu</button>
                <button onClick={() => setCartOpen(true)} className="hidden w-full rounded-full border border-[#d9c7b2] bg-white px-6 py-4 text-sm font-semibold transition hover:-translate-y-1 sm:block sm:w-auto">Öppna kundvagn</button>
              </div>
              <div className="fade-up mt-8 hidden gap-3 sm:mt-10 sm:grid sm:grid-cols-3 sm:gap-4">
                {["Fri frakt över 900 kr", "Trygg betalning", "Utvalda dofter för varje tillfälle"].map((text) => <div key={text} className="rounded-[24px] border border-white/70 bg-white/70 p-4 text-sm leading-6 text-[#5f4f3f] shadow-[0_20px_60px_-40px_rgba(53,31,15,0.45)] sm:rounded-[28px] sm:p-5">{text}</div>)}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[30px] border border-[#ead9c8] bg-[#241d18] p-3 shadow-[0_30px_100px_-45px_rgba(29,26,22,0.95)] sm:rounded-[36px] sm:p-4">
              <img src="/l.png" alt="Premium parfymkollektion" className="hero-float h-[15rem] w-full rounded-[24px] object-cover sm:h-[36rem] sm:rounded-[28px]" />
              <div className="absolute inset-x-4 bottom-4 rounded-[22px] border border-white/20 bg-white/12 p-3 text-white backdrop-blur-md sm:inset-x-10 sm:bottom-10 sm:rounded-[28px] sm:p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/70 sm:text-xs sm:tracking-[0.28em]">Atelier selection</div>
                <div className="mt-2 font-serif text-xl sm:text-2xl">Golden Bloom</div>
                <div className="mt-1 max-w-[14rem] text-sm leading-5 text-white/80 sm:max-w-none sm:leading-6">En mjuk och elegant favorit i kollektionen.</div>
              </div>
            </div>
          </section>

          <section className="mx-auto hidden max-w-7xl px-4 pb-8 sm:block sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-3">
              {[{ icon: ShieldCheck, title: "Noggrant utvalt", text: "Varje doft i kollektionen är vald för att ge ett tydligt och elegant uttryck." }, { icon: CreditCard, title: "Trygg betalning", text: "Beställningen genomförs säkert och smidigt med flera betalalternativ." }, { icon: HeartHandshake, title: "För varje tillfälle", text: "Mjuka, djupa och uttrycksfulla dofter för både vardag och kväll." }].map((item) => (
                <div key={item.title} className="fade-up rounded-[30px] border border-[#e8dccc] bg-[#fffaf4] p-7">
                  <item.icon className="text-[#8a6d52]" size={24} />
                  <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#5f4f3f]">{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {(page === "home" || page === "products") && (
        <section id="products-section" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-[#8a6d52]">Kollektionen</div>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Upptäck vår kollektion</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(["Alla", "Dam", "Herr"] as const).map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-3 text-sm font-medium transition sm:px-5 ${category === item ? "bg-[#1d1a16] text-white" : "border border-[#dcc9b6] bg-white text-[#5f4f3f]"}`}>{item}</button>)}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <article key={product.id} className="group fade-up overflow-hidden rounded-[28px] border border-[#ead8c4] bg-[#fffaf4] shadow-[0_22px_60px_-45px_rgba(72,40,13,0.55)] sm:rounded-[32px]" style={{ animationDelay: `${index * 90}ms` }}>
                <button onClick={() => setSelected(product)} className="relative block w-full overflow-hidden bg-[#f1e4d5]">
                  <img src={product.image} alt={product.name} className="h-64 w-full object-cover transition duration-700 group-hover:scale-105 sm:h-72" />
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#78593d]">{product.category}</span>
                    <span className="rounded-full bg-[#1d1a16]/75 px-3 py-1 text-xs text-white">{product.rating} <Star className="mb-0.5 ml-1 inline fill-current" size={12} /></span>
                  </div>
                </button>
                <div className="p-5 sm:p-6">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">{product.tagline}</p>
                  <h3 className="mt-3 text-xl font-semibold sm:text-2xl">{product.name}</h3>
                  <p className="mt-3 min-h-0 text-sm leading-6 text-[#5f4f3f] sm:min-h-20">{product.shortDesc}</p>
                  <div className="mt-5 flex flex-wrap gap-2">{product.notes.slice(0, 3).map((note) => <span key={note} className="rounded-full border border-[#ead8c4] bg-white px-3 py-1 text-xs text-[#6e5842]">{note}</span>)}</div>
                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">Pris</div><div className="mt-1 text-2xl font-semibold">{formatPrice(product.price)}</div></div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button onClick={() => setSelected(product)} className="rounded-full border border-[#d9c7b2] bg-white px-4 py-3 text-sm font-medium">Visa</button>
                      <button onClick={() => addToCart(product)} className="rounded-full bg-[#1d1a16] px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5">Köp</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {page === "about" && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[34px] border border-[#ead8c4] bg-[#fffaf4] p-8 lg:p-12">
              <div className="text-xs uppercase tracking-[0.3em] text-[#8a6d52]">Om företaget</div>
              <h2 className="mt-4 font-serif text-5xl leading-tight">Mauniele erbjuder dofter med karaktär, värme och närvaro.</h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#5f4f3f]">Vi vill göra det enkelt att hitta en doft som känns personlig. Kollektionen består av noggrant utvalda parfymoljor inspirerade av välkända doftvärldar, med fokus på elegans, kvalitet och en lyxig känsla i varje beställning.</p>
            </div>
            <div className="grid gap-5">{["Utvalda dofter för dam och herr.", "En varm och personlig känsla i hela kollektionen.", "Smidig beställning med trygg betalning och tydlig orderöversikt."].map((point) => <div key={point} className="rounded-[30px] border border-[#ead8c4] bg-white/70 p-6 text-sm leading-7 text-[#5f4f3f]">{point}</div>)}</div>
          </div>
        </section>
      )}

      {page === "contact" && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[34px] border border-[#ead8c4] bg-[#fffaf4] p-8 lg:p-12">
              <div className="text-xs uppercase tracking-[0.3em] text-[#8a6d52]">Kontakta oss</div>
              <h2 className="mt-4 font-serif text-5xl leading-tight">Vi hjälper dig gärna med frågor om produkter, beställningar och leverans.</h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#5f4f3f]">Hör av dig om du vill ha hjälp att välja doft, undrar över din order eller vill veta mer om kollektionen. Vi svarar så snart vi kan.</p>
            </div>
            <div className="grid gap-5">
              <div className="rounded-[30px] border border-[#ead8c4] bg-white/70 p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">E-post</div>
                <p className="mt-3 text-lg font-semibold">info@mauniele.com</p>
              </div>
              <div className="rounded-[30px] border border-[#ead8c4] bg-white/70 p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">Telefon</div>
                <p className="mt-3 text-lg font-semibold">+46 763 22 99 30</p>
              </div>
              <div className="rounded-[30px] border border-[#ead8c4] bg-white/70 p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">Svarstid</div>
                <p className="mt-3 text-sm leading-7 text-[#5f4f3f]">Vi återkommer vanligtvis inom 1-2 arbetsdagar.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="mx-auto mt-10 max-w-7xl px-4 pb-28 sm:pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-[#e6d6c6] bg-[#1d1a16] px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div><div className="font-serif text-3xl tracking-[0.2em]">MAUNIELE</div><p className="mt-3 max-w-lg text-sm leading-7 text-white/70">Exklusiva parfymoljor med en varm, elegant och personlig doftupplevelse.</p></div>
            <button onClick={() => goTo("products")} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1d1a16]">Handla nu <ArrowRight size={16} /></button>
          </div>
        </div>
      </footer>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-2 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-[#1d1a16]/60 backdrop-blur-md" onClick={() => setSelected(null)} />
          <div className="relative z-10 my-4 grid w-full max-w-5xl rounded-[28px] border border-white/20 bg-[#fffaf4] sm:max-h-[92vh] sm:overflow-hidden sm:rounded-[34px] md:grid-cols-[0.9fr_1.1fr]">
            <img src={selected.image} alt={selected.name} className="h-64 w-full object-cover sm:max-h-[92vh] sm:object-cover md:h-full" />
            <div className="p-5 sm:max-h-[92vh] sm:overflow-y-auto sm:p-8">
              <button onClick={() => setSelected(null)} className="ml-auto flex rounded-full bg-[#f3eadf] p-2"><X size={18} /></button>
              <div className="mt-4 text-xs uppercase tracking-[0.24em] text-[#8a6d52]">{selected.tagline}</div>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{selected.name}</h2>
              <p className="mt-4 text-[15px] leading-7 text-[#5f4f3f] sm:text-base sm:leading-8">{selected.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">{selected.notes.map((note) => <span key={note} className="rounded-full border border-[#ead8c4] bg-white px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#6e5842]">{note}</span>)}</div>
              <div className="mt-8 flex flex-col gap-4 border-t border-[#ead8c4] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">Pris</div><div className="mt-1 text-3xl font-semibold">{formatPrice(selected.price)}</div></div>
                <button onClick={() => addToCart(selected)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d1a16] px-6 py-4 text-sm font-semibold text-white">Lägg i kundvagn <ArrowRight size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5d8ca] bg-[#fffaf4]/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl gap-3">
          <button onClick={scrollToProducts} className="flex-1 rounded-full bg-[#1d1a16] px-4 py-3 text-sm font-semibold text-white">
            Handla nu
          </button>
          <button onClick={() => setCartOpen(true)} className="rounded-full border border-[#d9c7b2] bg-white px-4 py-3 text-sm font-semibold text-[#1d1a16]">
            Kundvagn {cartCount > 0 ? `(${cartCount})` : ""}
          </button>
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[#1d1a16]/55 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-white/20 bg-[#fffaf4] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ead8c4] px-4 py-4 sm:px-6 sm:py-5">
              <div><div className="text-xs uppercase tracking-[0.24em] text-[#8a6d52]">Din order</div><h2 className="mt-1 text-2xl font-semibold">Kundvagn</h2></div>
              <button onClick={() => setCartOpen(false)} className="rounded-full bg-[#f1e7db] p-2"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              {cart.length === 0 && <div className="rounded-[28px] border border-dashed border-[#dcc9b6] bg-white px-5 py-10 text-center text-sm text-[#5f4f3f]">Kundvagnen är tom.</div>}
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-[24px] border border-[#ead8c4] bg-white p-3 sm:gap-4 sm:rounded-[28px] sm:p-4">
                  <img src={item.image} alt={item.name} className="h-24 w-20 rounded-[18px] object-cover sm:h-28 sm:w-24 sm:rounded-[22px]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#8a6d52]">{item.category}</div>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold sm:text-lg">{item.name}</h3>
                    <p className="mt-2 text-sm text-[#5f4f3f]">{formatPrice(item.price)}</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-[#dcc9b6] px-2 py-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="rounded-full p-2 hover:bg-[#f4ece3]"><Minus size={14} /></button>
                        <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="rounded-full p-2 hover:bg-[#f4ece3]"><Plus size={14} /></button>
                      </div>
                      <div className="text-sm font-semibold">{formatPrice(item.quantity * item.price)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#ead8c4] bg-[#fbf5ee] px-4 py-4 sm:px-6 sm:py-6">
              <div className="space-y-3 rounded-[28px] border border-[#e8dccc] bg-white p-5">
                <div className="flex items-center justify-between text-sm text-[#5f4f3f]"><span>Subtotal</span><span>{formatPrice(localSummary.subtotal)}</span></div>
                <div className="flex items-center justify-between text-sm text-[#5f4f3f]"><span>Frakt</span><span>{localSummary.shipping === 0 ? "Gratis" : formatPrice(localSummary.shipping)}</span></div>
                <div className="flex items-center justify-between border-t border-[#efe3d7] pt-3 text-base font-semibold"><span>Totalt</span><span>{formatPrice(localSummary.total)}</span></div>
              </div>
              <button onClick={startCheckout} disabled={!cart.length} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#1d1a16] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50"><Lock size={18} />Gå till kassa</button>
            </div>
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto p-2 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-[#1d1a16]/65 backdrop-blur-md" onClick={() => (checkoutState === "success" || checkoutState === "error") ? setCheckoutOpen(false) : undefined} />
          <div className="relative z-10 my-4 grid w-full max-w-6xl rounded-[28px] border border-white/15 bg-[#fcf8f2] sm:max-h-[92vh] sm:overflow-hidden sm:rounded-[36px] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-[#ead8c4] bg-[#f5ecdf] p-4 sm:max-h-[92vh] sm:overflow-y-auto sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="text-xs uppercase tracking-[0.28em] text-[#8a6d52]">Orderöversikt</div>
              <h2 className="mt-2 text-2xl font-semibold sm:mt-3 sm:text-3xl">Kassa</h2>
              <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">{cart.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3 sm:rounded-[24px]"><img src={item.image} alt={item.name} className="h-14 w-12 rounded-[14px] object-cover sm:h-16 sm:w-14 sm:rounded-[18px]" /><div className="flex-1"><div className="text-sm font-medium">{item.name}</div><div className="text-xs text-[#8a6d52]">Antal {item.quantity}</div></div><div className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</div></div>)}</div>
              <div className="mt-6 space-y-3 rounded-[28px] bg-white p-5">
                <div className="flex items-center justify-between text-sm text-[#5f4f3f]"><span>Subtotal</span><span>{formatPrice(summary.subtotal)}</span></div>
                <div className="flex items-center justify-between text-sm text-[#5f4f3f]"><span>Frakt</span><span>{summary.shipping === 0 ? "Gratis" : formatPrice(summary.shipping)}</span></div>
                <div className="flex items-center justify-between border-t border-[#efe3d7] pt-3 text-lg font-semibold"><span>Att betala</span><span>{formatPrice(summary.total)}</span></div>
              </div>
            </div>
            <div className="relative p-4 sm:max-h-[92vh] sm:overflow-y-auto sm:p-6 lg:p-8">
              {(checkoutState === "ready" || checkoutState === "error") && <button onClick={() => setCheckoutOpen(false)} className="absolute right-5 top-5 rounded-full bg-[#f3eadf] p-2"><X size={18} /></button>}
              {checkoutState === "loading" && <div className="flex min-h-[28rem] flex-col items-center justify-center text-center"><Loader2 className="animate-spin text-[#8a6d52]" size={42} /><h3 className="mt-5 text-2xl font-semibold">Startar säker kassa</h3><p className="mt-2 max-w-md text-sm leading-7 text-[#5f4f3f]">Vi räknar totalsumman från varukorgen och hämtar rätt betalningssession från Stripe.</p></div>}
              {checkoutState === "error" && <div className="flex min-h-[28rem] flex-col items-center justify-center text-center"><div className="rounded-full bg-red-100 p-4 text-red-700"><X size={24} /></div><h3 className="mt-5 text-2xl font-semibold">Kassan kunde inte startas</h3><p className="mt-2 max-w-md text-sm leading-7 text-[#5f4f3f]">{checkoutError}</p><button onClick={() => setCheckoutOpen(false)} className="mt-6 rounded-full bg-[#1d1a16] px-5 py-3 text-sm font-semibold text-white">Tillbaka</button></div>}
              {checkoutState === "success" && <div className="flex min-h-[28rem] flex-col items-center justify-center text-center"><div className="rounded-full bg-green-100 p-4 text-green-700"><CheckCircle2 size={26} /></div><h3 className="mt-5 text-3xl font-semibold">Tack för din beställning</h3><p className="mt-2 max-w-md text-sm leading-7 text-[#5f4f3f]">Betalningen gick igenom och kundvagnen är nu rensad.</p><button onClick={() => setCheckoutOpen(false)} className="mt-6 rounded-full bg-[#1d1a16] px-5 py-3 text-sm font-semibold text-white">Fortsätt handla</button></div>}
              {checkoutState === "ready" && clientSecret && stripePromise && (
                <>
                  <div className="mb-6 max-w-lg"><div className="text-xs uppercase tracking-[0.28em] text-[#8a6d52]">Säker Stripe-betalning</div><h3 className="mt-3 text-3xl font-semibold">Slutför köpet</h3><p className="mt-2 text-sm leading-7 text-[#5f4f3f]">Alla summor är redan räknade från kundvagnen, så checkouten visar rätt total direkt.</p></div>
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#1d1a16", colorBackground: "#fffdfa", colorText: "#1d1a16", borderRadius: "18px" } } }}>
                    <CheckoutForm total={summary.total} cart={cart} deviceType={deviceType} onSuccess={completeCheckout} />
                  </Elements>
                </>
              )}
              {checkoutState === "ready" && !stripePromise && <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` saknas i `.env.local`.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
