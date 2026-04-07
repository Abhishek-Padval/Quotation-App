import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp' | 'forgot-password' | 'reset-otp'>('credentials');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        await api.createUser({ 
          email, 
          password, 
          first_name: firstName, 
          last_name: lastName, 
          mobile,
          role: 'user', 
          permissions: ['dashboard', 'quotations'] 
        });
        alert('Account created! Please sign in.');
        setIsSignup(false);
      } else {
        const data = await api.login(email, password);
        if (data.requiresOtp) {
          const otpData = await api.sendOtp(email, 'login');
          if (otpData.debugOtp) {
            setDebugOtp(otpData.debugOtp);
          }
          setStep('otp');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const otpData = await api.sendOtp(email, 'reset');
      if (otpData.debugOtp) {
        setDebugOtp(otpData.debugOtp);
      }
      setStep('reset-otp');
    } catch (err: any) {
      alert(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.resetPassword({ email, otp, newPassword });
      alert('Password reset successful! Please login with your new password.');
      setStep('credentials');
      setPassword('');
      setOtp('');
      setDebugOtp(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await api.verifyOtp(email, otp);
      onLogin(user);
    } catch (err) {
      alert('Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const type = step === 'reset-otp' ? 'reset' : 'login';
      const otpData = await api.sendOtp(email, type);
      if (otpData.debugOtp) {
        setDebugOtp(otpData.debugOtp);
      }
      alert('New OTP sent!');
    } catch (err) {
      alert('Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-indigo-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="#4F46E5"/>
              <path d="M35 35C35 35 40 30 50 30C61.0457 30 70 38.9543 70 50C70 61.0457 61.0457 70 50 70C38.9543 70 30 61.0457 30 50C30 45 32 40 35 37" stroke="white" strokeWidth="8" strokeLinecap="round"/>
              <path d="M60 60L75 75" stroke="white" strokeWidth="8" strokeLinecap="round"/>
              <path d="M75 25L78 32L85 35L78 38L75 45L72 38L65 35L72 32L75 25Z" fill="#FCD34D"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Quotation Pro</h1>
          <p className="text-indigo-100 text-sm mt-1">Secure Business Quotation Management</p>
        </div>

        <div className="p-8">
          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {isSignup && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                    <input 
                      type="text" 
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                    <input 
                      type="text" 
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Doe"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                    <input 
                      type="text" 
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  {!isSignup && (
                    <button 
                      type="button"
                      onClick={() => setStep('forgot-password')}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
                <ArrowRight size={20} />
              </button>

              {!isSignup && (
                <button 
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const data = await api.login('demo@example.com', 'demo');
                      if (data.user) {
                        onLogin(data.user);
                      }
                    } catch (err: any) {
                      alert('Demo login failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                >
                  <Zap size={20} className="text-amber-400" />
                  Try Demo Account
                </button>
              )}

              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-sm text-indigo-600 font-semibold hover:underline"
                >
                  {isSignup ? 'Already have an account? Sign In' : 'Need a new account? Sign Up'}
                </button>
              </div>
            </form>
          ) : step === 'forgot-password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Forgot Password</h3>
                <p className="text-sm text-slate-500">Enter your email to receive a reset code.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : step === 'reset-otp' ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold">Reset Password</h3>
                <p className="text-sm text-slate-500">Enter the code sent to {email} and your new password.</p>
                {debugOtp && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1">Your Reset Code (Debug Mode)</p>
                    <p className="text-2xl font-mono font-bold tracking-widest">{debugOtp}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reset Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>

              <div className="flex flex-col gap-2 text-center">
                <button 
                  type="button"
                  onClick={handleResendOtp}
                  className="text-sm text-indigo-600 font-semibold hover:underline"
                >
                  Didn't receive code? Resend
                </button>
                <button 
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Verify OTP</h3>
                <p className="text-sm text-slate-500">We've sent a code to {email}</p>
                {debugOtp && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1">Your Login Code (Debug Mode)</p>
                    <p className="text-2xl font-mono font-bold tracking-widest">{debugOtp}</p>
                  </div>
                )}
              </div>
              
              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="000000"
              />

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                {loading ? 'Verifying...' : 'Verify & Access'}
              </button>

              <div className="flex flex-col gap-2">
                <button 
                  type="button"
                  onClick={handleResendOtp}
                  className="text-sm text-indigo-600 font-semibold hover:underline"
                >
                  Didn't receive code? Resend
                </button>
                <button 
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck size={12} />
            Secure Enterprise Portal
          </p>
        </div>
      </motion.div>
    </div>
  );
}
