import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 2 ? local.slice(0, 2) : local[0];
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
};

const LoginPage = () => {
  // Step 1: password form
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Step 2: OTP verify
  const [otpStep, setOtpStep] = useState(false); // false = password form, true = OTP entry
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef([]);
  const { login, loading, verifyOTP, requestOTP } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const redirectAfterLogin = (userData) => {
    if (userData?.role === 'INSTRUCTOR') {
      navigate('/instructor/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  // ── Step 1: submit email + password ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    const result = await login(formData.email, formData.password);

    if (result.success && result.otp_required) {
      // Credentials verified — move to OTP step
      setOtpEmail(result.email || formData.email);
      setOtpValues(['', '', '', '', '', '']);
      setOtpStep(true);
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else if (result.success) {
      redirectAfterLogin(result.user);
    } else {
      setError(result.error);
    }
  };

  // ── Step 2: verify OTP ──
  const handleVerifyOTP = async (codeOverride) => {
    const code = codeOverride || otpValues.join('');
    if (code.length !== 6) { setError('Please enter the complete 6-digit code.'); return; }
    setError('');
    setOtpLoading(true);
    const result = await verifyOTP(otpEmail, code);
    setOtpLoading(false);
    if (result.success) {
      redirectAfterLogin(result.user);
    } else {
      setError(result.error);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  // OTP digit input handlers
  const handleOtpChange = (idx, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...otpValues];
    next[idx] = val;
    setOtpValues(next);
    setError('');
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    // Auto-submit when all 6 filled
    if (next.every(v => v !== '')) handleVerifyOTP(next.join(''));
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (otpValues[idx]) {
        const next = [...otpValues];
        next[idx] = '';
        setOtpValues(next);
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtpValues(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) handleVerifyOTP(pasted);
  };

  // Resend OTP (re-authenticate with same credentials)
  const handleResend = async () => {
    setError('');
    setOtpLoading(true);
    const result = await requestOTP(otpEmail);
    setOtpLoading(false);
    if (result.success) {
      setOtpValues(['', '', '', '', '', '']);
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">

          {/* ── Step 1: Email + Password ── */}
          {!otpStep && (
            <>
              <div className="auth-header">
                <h1>Welcome Back</h1>
                <p>Sign in to continue your learning journey</p>
              </div>

              {error && (
                <div className="auth-alert error">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><Mail size={18} /></span>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={e => { setFormData({ ...formData, email: e.target.value }); setError(''); }}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><Lock size={18} /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className="form-input"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={e => { setFormData({ ...formData, password: e.target.value }); setError(''); }}
                      autoComplete="current-password"
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </button>

                {/* 2FA notice */}
                <div style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(99,102,241,0.08)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: '0.813rem', color: 'var(--gray-500)',
                }}>
                  <ShieldCheck size={15} color="var(--primary)" />
                  A one-time verification code will be sent to your email after password check.
                </div>
              </form>

              <div className="auth-footer">
                Don't have an account? <Link to="/register">Create one</Link>
              </div>
            </>
          )}

          {/* ── Step 2: OTP Verification ── */}
          {otpStep && (
            <>
              <div className="auth-header">
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <ShieldCheck size={26} color="var(--primary)" />
                </div>
                <h1 style={{ fontSize: '1.375rem' }}>2-Step Verification</h1>
                <p>
                  We sent a 6-digit code to<br />
                  <strong style={{ color: 'var(--gray-800)' }}>{maskEmail(otpEmail)}</strong>
                </p>
              </div>

              {error && (
                <div className="auth-alert error">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* 6-digit boxes */}
              <div
                style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '8px 0 20px' }}
                onPaste={handleOtpPaste}
              >
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={e => handleOtpChange(idx, e)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    style={{
                      width: 48, height: 56, fontSize: 24, fontWeight: 700,
                      textAlign: 'center', border: '2px solid',
                      borderColor: val ? 'var(--primary)' : 'var(--gray-200)',
                      borderRadius: 12, background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = val ? 'var(--primary)' : 'var(--gray-200)'}
                  />
                ))}
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={() => handleVerifyOTP()}
                disabled={otpLoading || otpValues.join('').length < 6}
              >
                {otpLoading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {countdown > 0 ? (
                  <span style={{ fontSize: '0.813rem', color: 'var(--gray-400)' }}>
                    Resend code in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={otpLoading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.813rem', fontWeight: 500 }}
                  >
                    Resend code
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setOtpStep(false); setError(''); setOtpValues(['', '', '', '', '', '']); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: '0.813rem' }}
                >
                  Back to login
                </button>
              </div>

              <div className="auth-footer">
                Don't have an account? <Link to="/register">Create one</Link>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
