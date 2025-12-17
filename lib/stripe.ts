import Stripe from 'stripe';

// Stripe-klient - kräver STRIPE_SECRET_KEY i .env.local
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' })
    : null;

// EU-länder med standard momssatser
export const EU_VAT_RATES: Record<string, { name: string; rate: number }> = {
    AT: { name: 'Österrike', rate: 20 },
    BE: { name: 'Belgien', rate: 21 },
    BG: { name: 'Bulgarien', rate: 20 },
    HR: { name: 'Kroatien', rate: 25 },
    CY: { name: 'Cypern', rate: 19 },
    CZ: { name: 'Tjeckien', rate: 21 },
    DK: { name: 'Danmark', rate: 25 },
    EE: { name: 'Estland', rate: 22 },
    FI: { name: 'Finland', rate: 25.5 },
    FR: { name: 'Frankrike', rate: 20 },
    DE: { name: 'Tyskland', rate: 19 },
    GR: { name: 'Grekland', rate: 24 },
    HU: { name: 'Ungern', rate: 27 },
    IE: { name: 'Irland', rate: 23 },
    IT: { name: 'Italien', rate: 22 },
    LV: { name: 'Lettland', rate: 21 },
    LT: { name: 'Litauen', rate: 21 },
    LU: { name: 'Luxemburg', rate: 17 },
    MT: { name: 'Malta', rate: 18 },
    NL: { name: 'Nederländerna', rate: 21 },
    PL: { name: 'Polen', rate: 23 },
    PT: { name: 'Portugal', rate: 23 },
    RO: { name: 'Rumänien', rate: 19 },
    SK: { name: 'Slovakien', rate: 23 },
    SI: { name: 'Slovenien', rate: 22 },
    ES: { name: 'Spanien', rate: 21 },
    SE: { name: 'Sverige', rate: 25 },
};

// Kontrollera om land är inom EU
export function isEUCountry(countryCode: string): boolean {
    return countryCode in EU_VAT_RATES || countryCode === 'SE';
}

// Hämta momssats för ett land
export function getVATRate(countryCode: string): number {
    if (countryCode === 'SE') {
        return 25; // Svensk moms hanteras separat
    }
    return EU_VAT_RATES[countryCode]?.rate || 0;
}

// Beräkna momsbelopp från totalbelopp (moms ingår)
export function calculateVATFromTotal(totalAmount: number, vatRate: number): {
    netAmount: number;
    vatAmount: number
} {
    const vatAmount = totalAmount - (totalAmount / (1 + vatRate / 100));
    const netAmount = totalAmount - vatAmount;
    return {
        netAmount: Math.round(netAmount * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100
    };
}

// Typ för Stripe-transaktioner
export interface StripeTransactionData {
    stripeId: string;
    type: 'payout' | 'charge' | 'refund';
    amount: number;
    currency: string;
    customerCountry?: string;
    vatRate?: number;
    vatAmount?: number;
    stripeFee?: number;
    netAmount?: number;
    description?: string;
    rawData?: string;
}

// Hämta utbetalningar från Stripe
export async function getPayouts(limit: number = 10): Promise<Stripe.Payout[] | null> {
    if (!stripe) return null;

    const payouts = await stripe.payouts.list({ limit });
    return payouts.data;
}

// Hämta balance transactions för en utbetalning
export async function getPayoutDetails(payoutId: string): Promise<Stripe.BalanceTransaction[] | null> {
    if (!stripe) return null;

    const transactions = await stripe.balanceTransactions.list({
        payout: payoutId,
        limit: 100
    });
    return transactions.data;
}

// Hämta charge detaljer inklusive kundens land
export async function getChargeDetails(chargeId: string): Promise<{
    amount: number;
    fee: number;
    currency: string;
    country?: string;
    description?: string;
} | null> {
    if (!stripe) return null;

    const charge = await stripe.charges.retrieve(chargeId, {
        expand: ['balance_transaction']
    });

    const balanceTransaction = charge.balance_transaction as Stripe.BalanceTransaction;

    return {
        amount: charge.amount / 100,
        fee: balanceTransaction?.fee ? balanceTransaction.fee / 100 : 0,
        currency: charge.currency.toUpperCase(),
        country: charge.billing_details?.address?.country || undefined,
        description: charge.description || undefined
    };
}

// Konvertera Stripe-valuta till SEK (förenklad - använd verklig kurs i produktion)
export function convertToSEK(amount: number, currency: string): number {
    const rates: Record<string, number> = {
        SEK: 1,
        EUR: 11.50,
        USD: 10.50,
        GBP: 13.50,
        DKK: 1.55,
        NOK: 1.00,
    };

    const rate = rates[currency.toUpperCase()] || 1;
    return Math.round(amount * rate * 100) / 100;
}

// Bestäm vilket konto som ska användas baserat på kundland
export function getAccountsForTransaction(
    customerCountry: string | undefined,
    amount: number,
    vatRate: number
): {
    revenueAccount: number;
    vatAccount: number | null;
    vatAmount: number;
    netAmount: number;
} {
    // Försäljning utanför EU - ingen moms
    if (!customerCountry || !isEUCountry(customerCountry)) {
        return {
            revenueAccount: 3105, // Försäljning utanför EU
            vatAccount: null,
            vatAmount: 0,
            netAmount: amount
        };
    }

    // Försäljning i Sverige - svensk moms
    if (customerCountry === 'SE') {
        const { netAmount, vatAmount } = calculateVATFromTotal(amount, 25);
        return {
            revenueAccount: 3000, // Försäljning tjänster 25% moms
            vatAccount: 2610, // Utgående moms 25%
            vatAmount,
            netAmount
        };
    }

    // Försäljning inom EU (OSS)
    const { netAmount, vatAmount } = calculateVATFromTotal(amount, vatRate);
    return {
        revenueAccount: 3040, // Försäljning tjänster OSS-moms
        vatAccount: 2614, // Utgående moms OSS
        vatAmount,
        netAmount
    };
}
