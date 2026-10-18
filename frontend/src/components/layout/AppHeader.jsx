import React, { useState, useRef, useEffect } from 'react';
import DashboardIcon from '../ui/DashboardIcons';

export default function AppHeader({
  title,
  subtitle,
  activePatient,
  onOpenMobileMenu,
  onOpenNewPatientModal,
  dietitian,
  onOpenProfileModal,
  onLogout,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  const initials = dietitian?.name
    ? dietitian.name.replace(/^(Dr\.?\s*)/i, '').slice(0, 2).toUpperCase()
    : 'DR';

  return (
    <header className="ayur-header">
      <div className="ayur-header-left">
        <button
          type="button"
          className="ayur-mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation drawer"
        >
          <DashboardIcon name="menu" size={20} />
        </button>

        <div className="ayur-page-title-group">
          <h1 className="ayur-page-title">{title}</h1>
          {subtitle && <span className="ayur-page-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="ayur-header-right">
        {activePatient && (
          <div className="ayur-active-patient-pill" title={`Active: ${activePatient.name}`}>
            <span className="ayur-active-dot" aria-hidden="true" />
            <span className="ayur-active-text">
              Active: <strong>{activePatient.name}</strong>{' '}
              <span className="ayur-active-code">({activePatient.patient_code})</span>
            </span>
          </div>
        )}

        <div className="ayur-date-chip">
          <DashboardIcon name="calendar-days" size={14} className="ayur-date-icon" />
          <span>{formattedDate}</span>
        </div>

        {onOpenNewPatientModal && (
          <button
            type="button"
            className="btn-ayur-primary ayur-header-new-btn"
            onClick={onOpenNewPatientModal}
            aria-label="Register new patient"
          >
            <DashboardIcon name="user-plus" size={16} />
            <span>New Patient</span>
          </button>
        )}

        {/* Dietitian Profile Dropdown */}
        <div className="ayur-profile-menu-container" ref={dropdownRef}>
          <button
            type="button"
            className={`ayur-profile-trigger ${profileOpen ? 'open' : ''}`}
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User profile and settings"
          >
            <div className="ayur-profile-avatar">
              {dietitian?.photo_url ? (
                <img src={dietitian.photo_url} alt="" className="ayur-avatar-img" />
              ) : (
                initials
              )}
            </div>
            <span className="ayur-profile-name">
              {dietitian?.name || 'Dr. Vaidya'}
            </span>
            <DashboardIcon
              name="chevron-down"
              size={14}
              className={`ayur-profile-chevron ${profileOpen ? 'rotate' : ''}`}
            />
          </button>

          {profileOpen && (
            <div className="ayur-profile-dropdown" role="menu">
              <div className="ayur-dropdown-user-info">
                <div className="ayur-dropdown-avatar">
                  {dietitian?.photo_url ? (
                    <img src={dietitian.photo_url} alt="" className="ayur-avatar-img" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="ayur-dropdown-meta">
                  <span className="ayur-dropdown-name">{dietitian?.name || 'Dr. Vaidya'}</span>
                  <span className="ayur-dropdown-role">{dietitian?.role || 'Chief Clinical Dietitian'}</span>
                  <span className="ayur-dropdown-email">{dietitian?.email || 'vaidya@ayurdiet.clinic'}</span>
                </div>
              </div>

              <div className="ayur-dropdown-divider" />

              <button
                type="button"
                className="ayur-dropdown-item-btn"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);
                  if (onOpenProfileModal) onOpenProfileModal();
                }}
              >
                <DashboardIcon name="user-round" size={16} />
                <span>View & Edit Profile</span>
              </button>

              <div className="ayur-dropdown-divider" />

              {onLogout && (
                <button
                  type="button"
                  className="ayur-dropdown-logout-btn"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                >
                  <DashboardIcon name="log-out" size={16} />
                  <span>Sign Out of Portal</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

