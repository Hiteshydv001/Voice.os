import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, ArrowRight, UserPlus, Database } from 'lucide-react';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      return setError('ERROR: Password must be at least 6 characters.');
    }

    if (password !== confirmPassword) {
      return setError('ERROR: Access Keys do not match.');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password);
      navigate('/app/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('REGISTRATION FAILED: Identity already in system.');
      } else if (err.code === 'auth/weak-password') {
        setError('REGISTRATION FAILED: Password too weak (min 6 chars).');
      } else if (err.code === 'auth/invalid-email') {
        setError('REGISTRATION FAILED: Invalid email format.');
      } else {
        setError('REGISTRATION FAILED: Unable to create record.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate('/app/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`CONFIG ERROR: Domain "${window.location.hostname}" is not authorized in Firebase Console.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('AUTH CANCELLED: User closed the popup.');
      } else {
        setError('REGISTRATION FAILED: Google Auth Failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md">
         {/* Header Graphic */}
         <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-white flex items-center justify-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <UserPlus className="h-8 w-8 text-black" />
            </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8">
          <div className="border-b-4 border-black pb-4 mb-6 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">New Registration</h2>
            <p className="text-xs font-bold text-stone-500 mt-1 uppercase">Create Operator Record</p>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-600 p-3 mb-6 flex items-start text-red-900 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-stone-50 border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@corp.net"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Create Password (Min 6 chars)</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-stone-50 border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Confirm Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-stone-50 border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow font-medium"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="pt-4">
                <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-orange-600 text-white border-2 border-black font-bold uppercase hover:bg-orange-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                >
                {loading ? 'INITIALIZING...' : 'REGISTER IDENTITY'}
                </button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold">
              <span className="bg-white px-2 text-stone-500">Or Register Via</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full py-3 bg-white text-black border-2 border-black font-bold uppercase hover:bg-stone-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google Identity
          </button>

          <div className="mt-8 pt-6 border-t-2 border-black text-center text-xs font-bold uppercase">
            <p className="mb-2">Already in the system?</p>
            <Link to="/login" className="inline-flex items-center text-black hover:underline px-2 py-1 transition-colors">
              Return to Login <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>
         <div className="mt-8 text-center flex justify-center items-center gap-2 text-[10px] font-bold uppercase text-stone-400">
            <Database className="h-3 w-3" />
            <span>Local Database Write Permission</span>
        </div>
      </div>
    </div>
  );
};

export default SignUp;