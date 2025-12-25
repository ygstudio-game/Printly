import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  MapPin,
  ShoppingBag,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface SetupFormProps {
  onComplete: () => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true); // ✅ Toggle state

  // Login form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Registration form data
  const [registerData, setRegisterData] = useState({
    ownerName: '',
    shopName: '',
    email: '',
    password: '',
    address: '',
    city: '',
  });

  // ✅ Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await window.electron.loginPrinter(loginData);

      if (result.success) {
        onComplete();
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await window.electron.registerPrinter(registerData);

      if (result.success) {
        onComplete();
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-10 w-full max-w-xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">
            {isLogin ? 'Welcome Back' : 'Setup Your Shop'}
          </h1>
          <p className="text-slate-500 text-sm">
            {isLogin 
              ? 'Sign in to access your printer dashboard' 
              : 'Register this printer with your business'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-600 border border-red-300 p-3 rounded-lg mb-6 text-center text-sm">
            {error}
          </div>
        )}

        {/* ✅ LOGIN FORM */}
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <Mail className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="relative">
              <Lock className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium flex items-center justify-center transition gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-600 mt-4">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                className="text-slate-800 font-semibold hover:underline"
              >
                Register Now
              </button>
            </p>
          </form>
        ) : (
          /* ✅ REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Owner Name"
                  required
                  value={registerData.ownerName}
                  onChange={(e) => setRegisterData({ ...registerData, ownerName: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="relative">
                <ShoppingBag className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Shop Name"
                  required
                  value={registerData.shopName}
                  onChange={(e) => setRegisterData({ ...registerData, shopName: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="relative">
              <Mail className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="relative">
              <Lock className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                required
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <MapPin className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={registerData.city}
                  onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                  className="input-field"
                />
              </div>

              <input
                type="text"
                placeholder="Full Address"
                required
                value={registerData.address}
                onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium flex items-center justify-center transition gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Complete Setup <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-600 mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className="text-slate-800 font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .input-field {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #d6dee6;
          padding: 12px 12px 12px 42px;
          border-radius: 10px;
          color: #1e293b;
          outline: none;
          transition: 0.2s;
        }

        .input-field:focus {
          border-color: #475569;
          background: white;
        }
      `}</style>
    </div>
  );
};

export default SetupForm;
