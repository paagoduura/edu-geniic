import { useState } from 'react';
import { Crown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SANDBOX_REDIRECT = 'https://newwebpay-sandbox.interswitchng.com/collections/w/pay';
const LIVE_REDIRECT = 'https://newwebpay.interswitchng.com/collections/w/pay';

type Plan = { id: 'monthly' | 'yearly'; name: string; price: number; perks: string[]; badge?: string };
const PLANS: Plan[] = [
  { id: 'monthly', name: 'Monthly', price: 2500, perks: ['Unlimited AI tutoring', 'Adaptive quizzes', 'Offline lessons'] },
  { id: 'yearly', name: 'Yearly', price: 25000, perks: ['Everything in Monthly', '2 months free', 'Priority support'], badge: 'Best Value' },
];

function submitRedirectForm(action: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.target = '_blank';
  form.style.display = 'none';
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 1000);
}

export const UpgradePremium = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePay = async (plan: typeof PLANS[number]) => {
    if (!user || !session) {
      toast({ title: 'Sign in required', description: 'Please sign in to upgrade.' });
      navigate('/auth');
      return;
    }
    setLoadingPlan(plan.id);
    try {
      const amountMinor = plan.price * 100;
      const site_redirect_url = `${window.location.origin}/?txn_ref=`;

      const { data: init, error } = await supabase.functions.invoke('interswitch-payment?action=init', {
        body: { plan: plan.id, amount: amountMinor, currency: '566', site_redirect_url },
      });
      if (error || !init) throw new Error(error?.message ?? 'Failed to initialize payment');

      const action = init.mode === 'LIVE' ? LIVE_REDIRECT : SANDBOX_REDIRECT;

      const fields: Record<string, string> = {
        merchant_code: String(init.merchant_code),
        pay_item_id: String(init.pay_item_id),
        pay_item_name: `EduGenie Premium - ${plan.name}`,
        txn_ref: String(init.txn_ref),
        amount: String(init.amount),
        currency: String(init.currency),
        site_redirect_url,
        cust_id: user.id,
        cust_email: user.email ?? '',
        cust_name: user.user_metadata?.full_name ?? '',
      };
      if (init.hash) fields.hash = String(init.hash);

      submitRedirectForm(action, fields);

      toast({
        title: 'Checkout opened',
        description: 'Complete your payment in the new tab. We\'ll confirm automatically.',
      });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Could not start payment', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="gap-2 bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 transition-all"
        >
          <Crown className="w-4 h-4" />
          Upgrade to Premium
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" /> Choose your plan
          </DialogTitle>
          <DialogDescription>Secured by Interswitch — pay with card, transfer, USSD or wallet.</DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          {PLANS.map((p) => (
            <div key={p.id} className="relative rounded-xl border border-border p-4 bg-card flex flex-col">
              {p.badge && (
                <span className="absolute -top-2 right-3 text-[10px] uppercase tracking-wide bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {p.badge}
                </span>
              )}
              <div className="font-semibold">{p.name}</div>
              <div className="text-2xl font-bold mt-1">
                ₦{p.price.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground">/{p.id === 'yearly' ? 'yr' : 'mo'}</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm flex-1">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {perk}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                onClick={() => handlePay(p)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === p.id ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                ) : (
                  `Pay ₦${p.price.toLocaleString()}`
                )}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePremium;
