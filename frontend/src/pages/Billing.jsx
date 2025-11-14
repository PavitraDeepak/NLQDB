import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import { Check, CreditCard, Zap, Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const Billing = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [subData, plansData] = await Promise.all([
        apiService.getCurrentSubscription(),
        apiService.getPlans()
      ]);
      setSubscription(subData);
      setPlans(plansData);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      const response = await apiService.upgradePlan(planId);
      window.location.href = response.checkoutUrl;
    } catch (error) {
      console.error('Failed to start upgrade:', error);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await apiService.createPortalSession();
      window.location.href = response.url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  const currentPlan = subscription?.plan || 'free';

  const planIcons = {
    free: Zap,
    pro: CreditCard,
    enterprise: Building2,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Billing & Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your subscription and billing details
          </p>
        </div>

        {/* Current Subscription Card */}
        {subscription && (
          <Card className="mb-8" title="Current Subscription">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-semibold text-gray-900 capitalize">
                    {currentPlan}
                  </p>
                  <span className={`
                    text-sm font-medium px-2 py-1 rounded-md
                    ${subscription.status === 'active' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-gray-50 text-gray-700'
                    }
                  `}>
                    {subscription.status}
                  </span>
                </div>
                {subscription.currentPeriodEnd && (
                  <p className="text-sm text-gray-500 mt-2">
                    {subscription.cancelAtPeriodEnd 
                      ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    }
                  </p>
                )}
              </div>
              {currentPlan !== 'free' && (
                <Button
                  variant="secondary"
                  onClick={handleManageBilling}
                >
                  Manage Billing
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = planIcons[plan.id] || Zap;
            const isCurrentPlan = plan.id === currentPlan;
            const isFree = plan.id === 'free';

            return (
              <Card
                key={plan.id}
                className={`relative ${isCurrentPlan ? 'border-black border-2' : ''}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-black text-white text-xs font-medium px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="inline-flex p-3 bg-gray-50 rounded-lg mb-4">
                    <Icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 capitalize mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-semibold text-gray-900">
                      ${plan.price}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-gray-500">/month</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-gray-900 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : plan.id === 'enterprise' ? (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => window.location.href = 'mailto:sales@nlqdb.com'}
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {currentPlan === 'free' ? 'Upgrade' : 'Switch Plan'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Can I change my plan at any time?
              </h3>
              <p className="text-sm text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately,
                and we'll prorate any charges or credits.
              </p>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                What happens if I exceed my plan limits?
              </h3>
              <p className="text-sm text-gray-600">
                Your service will be temporarily paused until you upgrade or the next billing cycle begins.
                You'll receive notifications before reaching your limits.
              </p>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-sm text-gray-600">
                We offer a 14-day money-back guarantee on all paid plans. Contact support for assistance.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
