import React, { useState } from 'react';
import { X, Check, Zap, Shield, Crown } from 'lucide-react';
import { initiateStripeCheckout } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { STRIPE_PRICES } from '../config/stripe';

interface SubscriptionModalProps {
  onClose: () => void;
  currentCredits: number;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, currentCredits }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  // NOTE: These IDs must correspond to actual Products/Prices in your Stripe Dashboard.
  // If they don't exist, Stripe Checkout will show an error.
  const handlePurchase = async (priceId: string) => {
    if (!currentUser) return;
    setLoading(priceId);

    try {
      await initiateStripeCheckout(priceId);
    } catch (error: any) {
      console.error("Purchase failed", error);
      alert("Payment Error: " + error.message);
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-mono">
      <div className="bg-stone-100 border-4 border-black w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[12px_12px_0px_0px_rgba(255,165,0,1)]">
        <div className="bg-black p-4 text-white flex justify-between items-center border-b-4 border-black sticky top-0 z-10">
          <div className="flex items-center gap-2">
             <Zap className="h-5 w-5 text-orange-500" />
             <h3 className="font-bold text-xl uppercase tracking-wider">Refuel Credits</h3>
          </div>
          <button onClick={onClose} className="text-white hover:text-orange-500 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8">
            <div className="text-center mb-10">
                <p className="text-sm font-bold uppercase text-stone-500 mb-2">Current Balance</p>
                <div className="text-4xl font-black">{currentCredits} CR</div>
                <p className="text-xs text-red-600 font-bold mt-2 uppercase">
                    {currentCredits < 5 ? '⚠️ Insufficient Funds for Calling' : 'System Operational'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic Pack - $2,000 */}
                <div className="bg-white border-2 border-black p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col">
                    <div className="text-center mb-6">
                        <div className="inline-block p-3 bg-stone-100 rounded-full border-2 border-black mb-4">
                            <Shield className="h-6 w-6 text-black" />
                        </div>
                        <h4 className="text-xl font-black uppercase">Starter</h4>
                        <div className="text-3xl font-bold mt-2">$2,000</div>
                        <p className="text-sm font-bold text-stone-500">2,000 Credits</p>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2" /> 400 Minutes Talk Time</li>
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2" /> Standard Support</li>
                    </ul>
                    <button 
                        onClick={() => handlePurchase(STRIPE_PRICES.starter)}
                        disabled={!!loading}
                        className="w-full py-3 border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-all disabled:opacity-50"
                    >
                        {loading === STRIPE_PRICES.starter ? 'Redirecting...' : 'Select'}
                    </button>
                </div>

                {/* Pro Pack - $5,000 */}
                <div className="bg-black text-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] transform md:-translate-y-4 flex flex-col relative">
                    <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 uppercase">Best Value</div>
                    <div className="text-center mb-6">
                        <div className="inline-block p-3 bg-orange-600 rounded-full border-2 border-white mb-4">
                            <Zap className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="text-xl font-black uppercase">Growth</h4>
                        <div className="text-3xl font-bold mt-2">$5,000</div>
                        <p className="text-sm font-bold text-stone-300">6,000 Credits</p>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2 text-orange-500" /> 1,200 Minutes Talk Time</li>
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2 text-orange-500" /> Priority Routing</li>
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2 text-orange-500" /> +10% Bonus Credits</li>
                    </ul>
                    <button 
                         onClick={() => handlePurchase(STRIPE_PRICES.growth)}
                         disabled={!!loading}
                         className="w-full py-3 bg-white text-black border-2 border-white font-bold uppercase hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all disabled:opacity-50"
                    >
                         {loading === STRIPE_PRICES.growth ? 'Redirecting...' : 'Deploy'}
                    </button>
                </div>

                {/* Enterprise Pack - $10,000 */}
                <div className="bg-white border-2 border-black p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col">
                    <div className="text-center mb-6">
                        <div className="inline-block p-3 bg-purple-100 rounded-full border-2 border-black mb-4">
                            <Crown className="h-6 w-6 text-black" />
                        </div>
                        <h4 className="text-xl font-black uppercase">Scale</h4>
                        <div className="text-3xl font-bold mt-2">$10,000</div>
                        <p className="text-sm font-bold text-stone-500">15,000 Credits</p>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2" /> 3,000 Minutes Talk Time</li>
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2" /> Dedicated IP</li>
                        <li className="flex items-center text-xs font-bold"><Check className="h-4 w-4 mr-2" /> +25% Bonus Credits</li>
                    </ul>
                    <button 
                         onClick={() => handlePurchase(STRIPE_PRICES.scale)}
                         disabled={!!loading}
                         className="w-full py-3 border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-all disabled:opacity-50"
                    >
                         {loading === STRIPE_PRICES.scale ? 'Redirecting...' : 'Select'}
                    </button>
                </div>
            </div>

            <p className="text-center text-xs text-stone-500 mt-8 font-bold uppercase">
                Secure payments processed via <strong>STRIPE</strong>.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;