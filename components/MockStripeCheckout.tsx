import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MockStripeCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [txnDetails, setTxnDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/26');
  const [cvc, setCvc] = useState('123');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const txnId = searchParams.get('txn_id');
    if (!txnId) {
      navigate('/app/dashboard');
      return;
    }

    const storedTxn = sessionStorage.getItem(txnId);
    if (!storedTxn) {
      alert("Session expired or invalid.");
      navigate('/app/dashboard');
      return;
    }

    setTxnDetails(JSON.parse(storedTxn));
  }, [searchParams, navigate]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate Payment Processing Time
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (cardNumber.replace(/\s/g, '') === '4242424242424242') {
        const txnId = searchParams.get('txn_id');
        navigate(`/payment-success?txn_id=${txnId}`);
    } else {
        setError("Card declined. Try using the Test Card (4242...)");
        setLoading(false);
    }
  };

  if (!txnDetails) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
        {/* Left Panel - Order Summary */}
        <div className="w-full md:w-1/2 bg-gray-100 p-8 md:p-12 flex flex-col justify-center border-r border-gray-200">
            <div className="max-w-md mx-auto w-full">
                <button onClick={() => navigate('/app/dashboard')} className="flex items-center text-gray-500 mb-8 hover:text-black">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
                </button>

                <div className="flex items-center mb-6">
                     <div className="h-10 w-10 bg-black flex items-center justify-center rounded-lg mr-3">
                        <CreditCard className="text-white h-6 w-6" />
                     </div>
                     <span className="font-bold text-xl tracking-tight">Voice.OS Inc.</span>
                </div>

                <div className="mb-8">
                    <p className="text-gray-500 text-sm uppercase font-bold tracking-wider mb-2">Pay Voice.OS</p>
                    <h1 className="text-4xl font-extrabold text-gray-900">${txnDetails.price}.00</h1>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">Credit Pack ({txnDetails.credits.toLocaleString()})</span>
                        <span className="font-bold">${txnDetails.price}.00</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Tax</span>
                        <span>$0.00</span>
                    </div>
                    <div className="border-t border-gray-100 my-2 pt-2 flex justify-between items-center font-bold">
                        <span>Total</span>
                        <span>${txnDetails.price}.00</span>
                    </div>
                </div>
                
                <div className="mt-8 flex items-center text-green-600 text-xs font-bold uppercase">
                     <ShieldCheck className="h-4 w-4 mr-2" />
                     Test Mode: No real money will be charged.
                </div>
            </div>
        </div>

        {/* Right Panel - Payment Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center shadow-2xl z-10">
            <div className="max-w-md mx-auto w-full">
                <h2 className="text-xl font-bold mb-6">Pay with card</h2>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm font-medium border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handlePay} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={currentUser?.email || ''} 
                            disabled 
                            className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                    </div>
                    
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Card Information</label>
                         <div className="border border-gray-300 rounded-md overflow-hidden">
                             <input 
                                type="text" 
                                value={cardNumber}
                                onChange={e => setCardNumber(e.target.value)}
                                className="w-full p-3 border-b border-gray-300 focus:outline-none focus:bg-blue-50 transition-colors font-mono"
                                placeholder="4242 4242 4242 4242"
                             />
                             <div className="flex">
                                 <input 
                                    type="text" 
                                    value={expiry}
                                    onChange={e => setExpiry(e.target.value)}
                                    className="w-1/2 p-3 border-r border-gray-300 focus:outline-none focus:bg-blue-50 transition-colors font-mono"
                                    placeholder="MM/YY"
                                 />
                                 <input 
                                    type="text" 
                                    value={cvc}
                                    onChange={e => setCvc(e.target.value)}
                                    className="w-1/2 p-3 focus:outline-none focus:bg-blue-50 transition-colors font-mono"
                                    placeholder="CVC"
                                 />
                             </div>
                         </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            placeholder="John Doe"
                            defaultValue="Test User"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-md shadow-lg transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : `Pay $${txnDetails.price}.00`}
                    </button>
                    
                    <div className="flex items-center justify-center mt-4 text-gray-400 text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Payments processed securely by MockStripe
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default MockStripeCheckout;