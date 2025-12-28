import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addCredits, verifyTransaction } from '../services/userService';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, refreshProfile } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [creditsAdded, setCreditsAdded] = useState(0);

  useEffect(() => {
    const processPayment = async () => {
      if (!currentUser) return;
      
      const sessionId = searchParams.get('session_id');
      const priceId = searchParams.get('price_id');
      
      if (!sessionId) {
        setStatus('error');
        setTimeout(() => navigate('/app/dashboard'), 3000);
        return;
      }

      // Verify transaction presence
      const isValid = verifyTransaction(sessionId);

      if (isValid) {
        // Determine credit amount based on price ID (Simplistic mapping for demo)
        // In a real app, the backend would tell us how much to add via webhooks
        let amountToAdd = 2000; // Starter
        if (priceId === 'price_growth_real') amountToAdd = 6000;
        if (priceId === 'price_scale_real') amountToAdd = 15000;

        await addCredits(currentUser.uid, amountToAdd);
        await refreshProfile();
        setCreditsAdded(amountToAdd);
        setStatus('success');
        
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 3000);
      } else {
        setStatus('error');
        setTimeout(() => navigate('/app/dashboard'), 3000);
      }
    };

    processPayment();
  }, [currentUser, searchParams, navigate, refreshProfile]);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-mono">
       <div className="text-center bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
            {status === 'verifying' && (
                <>
                    <div className="flex justify-center mb-6">
                        <Loader2 className="h-16 w-16 animate-spin text-orange-600" />
                    </div>
                    <h2 className="text-xl font-black uppercase mb-2">Verifying Transaction</h2>
                    <p className="text-stone-500 font-bold text-sm">Validating Stripe Session...</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="flex justify-center mb-6">
                        <CheckCircle className="h-20 w-20 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-black uppercase mb-4">Payment Confirmed</h2>
                    <div className="bg-stone-100 p-4 border-2 border-black mb-6">
                        <p className="text-xs font-bold uppercase text-stone-500">Credits Added</p>
                        <p className="text-2xl font-black text-black">+{creditsAdded.toLocaleString()}</p>
                    </div>
                    <p className="text-stone-600 text-xs font-bold uppercase animate-pulse">
                        Redirecting to Command Center...
                    </p>
                </>
            )}

            {status === 'error' && (
                <>
                    <div className="flex justify-center mb-6">
                        <XCircle className="h-20 w-20 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black uppercase mb-4">Transaction Invalid</h2>
                    <p className="text-stone-600 mb-6 font-bold text-sm">
                        Unable to verify session or payment failed.
                    </p>
                    <p className="text-stone-400 text-xs font-bold uppercase">
                        Returning to base...
                    </p>
                </>
            )}
       </div>
    </div>
  );
};

export default PaymentSuccess;