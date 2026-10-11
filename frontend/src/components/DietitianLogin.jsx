import React, { useState } from 'react';
import { api } from '../services/api';

export default function DietitianLogin({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!identifier.trim()) {
      errs.identifier = 'Please enter your dietitian email or username.';
    }
    if (!password) {
      errs.password = 'Please enter your password.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
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

        <div className="dietitian-login-intro">
          <h2>Dietitian Sign In</h2>
          <p>Sign in with your practitioner credentials to access patient assessments and Ayurvedic dietary protocols.</p>
        </div>

        {/* Server Error Alert Banner */}
        {serverError && (
          <div className="login-alert-error" role="alert">
            <span className="login-alert-icon">⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="dietitian-login-form" noValidate>
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
        </form>

        {/* Credentials Helper Box */}
        <div className="dietitian-credentials-hint">
          <div className="hint-title">
            <span>ℹ️</span> Practitioner Access
          </div>
          <div className="hint-content">
            <div>Email: <strong>dietitian@ayurdiet.com</strong></div>
            <div>Username: <strong>dietitian</strong></div>
            <div>Password: <strong>Dietitian@123</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
