import React, { useState } from 'react';
import { api } from '../services/api';

export default function DietitianLogin({ onLoginSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'

  // Sign In state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  // Common UI state
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrors({});
    setServerError('');
    setSuccessMessage('');
  };

  // Validation for Sign In
  const validateSignIn = () => {
    const errs = {};
    if (!identifier.trim()) {
      errs.identifier = 'Please enter your dietitian email or username.';
    }
    if (!password) {
      errs.password = 'Please enter your password.';
    }
    return errs;
  };

  // Validation for Sign Up
  const validateSignUp = () => {
    const errs = {};
    if (!signupData.name.trim()) {
      errs.name = 'Please enter your full name.';
    } else if (signupData.name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signupData.email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!emailRegex.test(signupData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!signupData.username.trim()) {
      errs.username = 'Please choose a username.';
    } else if (signupData.username.trim().length < 3) {
      errs.username = 'Username must be at least 3 characters.';
    }

    if (!signupData.password) {
      errs.password = 'Please enter a password.';
    } else if (signupData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!signupData.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (signupData.password !== signupData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    return errs;
  };

  // Handle Sign In submit
  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    const validationErrors = validateSignIn();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await api.login({
        identifier: identifier.trim(),
        password,
      });

      if (response && response.status === 'success') {
        if (onLoginSuccess) {
          onLoginSuccess(response.data);
        }
      } else {
        setServerError(response?.message || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      console.error('Dietitian login error:', err);
      const message =
        err?.status === 401
          ? 'Invalid email/username or password. Please check your credentials.'
          : err?.message || 'Unable to connect to authentication server. Please try again.';
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up submit
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    const validationErrors = validateSignUp();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await api.signup({
        name: signupData.name.trim(),
        email: signupData.email.trim(),
        username: signupData.username.trim(),
        password: signupData.password,
        confirmPassword: signupData.confirmPassword,
      });

      if (response && response.status === 'success') {
        setSuccessMessage('Account created successfully! Signing into your workspace...');
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(response.data);
          }
        }, 600);
      } else {
        setServerError(response?.message || 'Failed to create dietitian account.');
      }
    } catch (err) {
      console.error('Dietitian sign up error:', err);
      const message =
        err?.status === 409
          ? err?.message || 'Email or username already exists. Please choose a different one.'
          : err?.message || 'Unable to register dietitian account. Please try again.';
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dietitian-login-wrapper">
      <div className="dietitian-login-card">
        {/* Brand Header */}
        <div className="dietitian-login-header">
          <div className="brand-logo-mark" aria-hidden="true">
            A
          </div>
          <h1 className="dietitian-login-title">AyurDiet</h1>
          <p className="dietitian-login-badge">Clinical Dietitian Portal</p>
        </div>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="auth-mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-mode-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => switchMode('signin')}
            disabled={isLoading}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-mode-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
            disabled={isLoading}
          >
            Sign Up
          </button>
        </div>

        {/* Intro text */}
        <div className="dietitian-login-intro">
          <h2>{mode === 'signin' ? 'Dietitian Sign In' : 'Create Dietitian Account'}</h2>
          <p>
            {mode === 'signin'
              ? 'Sign in with your practitioner credentials to access patient assessments and Ayurvedic dietary protocols.'
              : 'Register as a new clinical dietitian to establish your personalized practitioner workspace.'}
          </p>
        </div>

        {/* Server Error Alert Banner */}
        {serverError && (
          <div className="login-alert-error" role="alert">
            <span className="login-alert-icon">⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="login-alert-success" role="status">
            <span className="login-alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="dietitian-login-form" noValidate>
            <div className="form-group">
              <label htmlFor="dietitian-identifier" className="form-label">
                Dietitian Email or Username <span className="required">*</span>
              </label>
              <input
                id="dietitian-identifier"
                type="text"
                name="identifier"
                className={`form-input ${errors.identifier ? 'input-error' : ''}`}
                placeholder="e.g. dietitian@ayurdiet.com or dietitian"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) {
                    setErrors((prev) => ({ ...prev, identifier: '' }));
                  }
                }}
                autoComplete="username"
                disabled={isLoading}
              />
              {errors.identifier && (
                <span className="form-error-msg">{errors.identifier}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="dietitian-password" className="form-label">
                Password <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="dietitian-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <span className="form-error-msg">{errors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary btn-login-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In as Dietitian'
              )}
            </button>

            <div className="auth-switch-link">
              New dietitian?{' '}
              <button
                type="button"
                className="btn-link-action"
                onClick={() => switchMode('signup')}
                disabled={isLoading}
              >
                Create Account (Sign Up)
              </button>
            </div>

            {/* Credentials Helper Box */}
            <div className="dietitian-credentials-hint">
              <div className="hint-title">
                <span>ℹ️</span> Practitioner Demo Access
              </div>
              <div className="hint-content">
                <div>Email: <strong>dietitian@ayurdiet.com</strong></div>
                <div>Username: <strong>dietitian</strong></div>
                <div>Password: <strong>Dietitian@123</strong></div>
              </div>
            </div>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="dietitian-login-form" noValidate>
            <div className="form-group">
              <label htmlFor="signup-name" className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="signup-name"
                type="text"
                name="name"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. Dr. Sneha Patil"
                value={signupData.name}
                onChange={(e) => {
                  setSignupData({ ...signupData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                autoComplete="name"
                disabled={isLoading}
              />
              {errors.name && <span className="form-error-msg">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="signup-email" className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="signup-email"
                type="email"
                name="email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="e.g. dr.sneha@clinic.com"
                value={signupData.email}
                onChange={(e) => {
                  setSignupData({ ...signupData, email: e.target.value });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                autoComplete="email"
                disabled={isLoading}
              />
              {errors.email && <span className="form-error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="signup-username" className="form-label">
                Username <span className="required">*</span>
              </label>
              <input
                id="signup-username"
                type="text"
                name="username"
                className={`form-input ${errors.username ? 'input-error' : ''}`}
                placeholder="e.g. dr_sneha"
                value={signupData.username}
                onChange={(e) => {
                  setSignupData({ ...signupData, username: e.target.value });
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                }}
                autoComplete="username"
                disabled={isLoading}
              />
              {errors.username && <span className="form-error-msg">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="signup-password" className="form-label">
                Password <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="signup-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  name="password"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min 6 characters"
                  value={signupData.password}
                  onChange={(e) => {
                    setSignupData({ ...signupData, password: e.target.value });
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowSignupPassword((prev) => !prev)}
                  title={showSignupPassword ? 'Hide password' : 'Show password'}
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showSignupPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <span className="form-error-msg">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="signup-confirm-password" className="form-label">
                Confirm Password <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="signup-confirm-password"
                  type={showSignupConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Re-enter password"
                  value={signupData.confirmPassword}
                  onChange={(e) => {
                    setSignupData({ ...signupData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowSignupConfirm((prev) => !prev)}
                  title={showSignupConfirm ? 'Hide password' : 'Show password'}
                  aria-label={showSignupConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showSignupConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="form-error-msg">{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary btn-login-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  <span>Creating Account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="auth-switch-link">
              Already have an account?{' '}
              <button
                type="button"
                className="btn-link-action"
                onClick={() => switchMode('signin')}
                disabled={isLoading}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
