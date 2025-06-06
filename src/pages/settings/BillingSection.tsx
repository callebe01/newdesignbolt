import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { products } from '../../stripe-config';
import { createCheckoutSession, getCurrentSubscription } from '../../services/stripe';

export const BillingSection = () => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const sub = await getCurrentSubscription();
        setSubscription(sub);
      } catch (err) {
        console.error('Failed to load subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const handleUpgrade = async (priceId: string) => {
    try {
      setCheckoutLoading(true);
      const checkoutUrl = await createCheckoutSession(priceId, 'subscription');
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Failed to start checkout:', err);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getCurrentPlan = () => {
    if (!subscription?.price_id) return 'Free Plan';
    const product = products.find(p => p.priceId === subscription.price_id);
    return product?.name || 'Unknown Plan';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Billing & Subscription
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h3 className="font-medium">Current Plan</h3>
              <p className="text-2xl font-bold">{getCurrentPlan()}</p>
              {subscription?.subscription_id && (
                <div className="text-sm text-muted-foreground">
                  {subscription.payment_method_brand && subscription.payment_method_last4 && (
                    <p>
                      Paid with {subscription.payment_method_brand.toUpperCase()} ending in {subscription.payment_method_last4}
                    </p>
                  )}
                  <p>
                    Next billing date: {
                      subscription.current_period_end
                        ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
                        : 'N/A'
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-lg border p-4 ${
                    subscription?.price_id === product.priceId
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                >
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.description}
                  </p>
                  {subscription?.price_id === product.priceId ? (
                    <Button
                      className="mt-4 w-full"
                      variant="outline"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="mt-4 w-full"
                      onClick={() => handleUpgrade(product.priceId)}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Upgrade'
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};