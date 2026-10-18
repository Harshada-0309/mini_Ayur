import React, { useState, useEffect } from 'react';
import DashboardIcon from '../ui/DashboardIcons';
import { api } from '../../services/api';

export default function DietitianProfileModal({ isOpen, onClose, dietitian, onProfileUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    qualifications: '',
    clinic_name: '',
    photo_url: '',
  });
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (dietitian) {
      setFormData({
        name: dietitian.name || '',
        role: dietitian.role || 'Chief Clinical Dietitian',
        email: dietitian.email || '',
        phone: dietitian.phone || '+91 98765 43210',
        qualifications: dietitian.qualifications || 'BAMS, MD (Ayurveda), PGD Clinical Nutrition',
        clinic_name: dietitian.clinic_name || 'AyurDiet Integrative Health Clinic',
        photo_url: dietitian.photo_url || '/images/dietitian-hero-doctor.jpg',
      });
      setPreviewPhoto(dietitian.photo_url || '/images/dietitian-hero-doctor.jpg');
    }
  }, [dietitian, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image file size must be less than 5 MB.');
      return;
    }

    try {
      setUploadingPhoto(true);
      // Upload directly to permanent server disk storage
      const res = await api.uploadDietitianPhoto(file);
      const newPhotoUrl = res.data?.photo_url;
      const updatedDietitian = res.data?.dietitian;

      if (newPhotoUrl) {
        setPreviewPhoto(newPhotoUrl);
        setFormData((prev) => ({ ...prev, photo_url: newPhotoUrl }));
      }
      if (updatedDietitian && onProfileUpdated) {
        onProfileUpdated(updatedDietitian);
      }
      setSuccess('Photograph uploaded and saved to practitioner profile successfully.');
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    if (dietitian) {
      setFormData({
        name: dietitian.name || '',
        role: dietitian.role || 'Chief Clinical Dietitian',
        email: dietitian.email || '',
        phone: dietitian.phone || '+91 98765 43210',
        qualifications: dietitian.qualifications || 'BAMS, MD (Ayurveda), PGD Clinical Nutrition',
        clinic_name: dietitian.clinic_name || 'AyurDiet Integrative Health Clinic',
        photo_url: dietitian.photo_url || '/images/dietitian-hero-doctor.jpg',
      });
      setPreviewPhoto(dietitian.photo_url || '/images/dietitian-hero-doctor.jpg');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError('Dietitian practitioner name cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.updateDietitianProfile({
        name: formData.name.trim(),
        role: formData.role.trim(),
        phone: formData.phone.trim(),
        qualifications: formData.qualifications.trim(),
        clinic_name: formData.clinic_name.trim(),
        photo_url: formData.photo_url,
      });

      const updated = res.data?.dietitian;
      if (updated && onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setSuccess('Dietitian profile saved and updated successfully.');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Could not update dietitian profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="dietitian-profile-title">
      <div className="modal-content ayur-dietitian-profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="profile-icon-badge">
              <DashboardIcon name="user-round" size={18} />
            </div>
            <div>
              <h3 id="dietitian-profile-title" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-deep-slate)' }}>
                Dietitian Clinical Profile
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-slate-muted)' }}>
                AyurDiet Integrative Health Clinic Credentials
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <DashboardIcon name="x" size={18} />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="toast-banner toast-error" style={{ margin: '1rem 1.5rem 0' }}>
            <DashboardIcon name="shield-alert" size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="toast-banner toast-success" style={{ margin: '1rem 1.5rem 0', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)' }}>
            <DashboardIcon name="check" size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {!isEditing ? (
            /* View Mode */
            <div className="dietitian-profile-card-view">
              <div className="dietitian-profile-banner">
                <div className="dietitian-avatar-large-container">
                  <img
                    src={previewPhoto || '/images/dietitian-hero-doctor.jpg'}
                    alt={formData.name || 'Dietitian'}
                    className="dietitian-avatar-large"
                    onError={(e) => {
                      e.target.src = '/images/dietitian-hero-doctor.jpg';
                    }}
                  />
                  <div className="dietitian-verified-check" title="Clinically Verified Dietitian">
                    <DashboardIcon name="shield-check" size={14} />
                  </div>
                </div>

                <div className="dietitian-banner-info">
                  <h2 className="dietitian-name-title">{formData.name || 'Dr. Vaidya'}</h2>
                  <div className="dietitian-role-pill">{formData.role || 'Chief Clinical Dietitian'}</div>
                  <div className="dietitian-qualifications-text">
                    <DashboardIcon name="book-open" size={14} />
                    <span>{formData.qualifications}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Details Grid */}
              <div className="dietitian-details-grid">
                <div className="dietitian-detail-item">
                  <span className="detail-item-label">Clinic Center</span>
                  <div className="detail-item-value">
                    <DashboardIcon name="sprout" size={16} />
                    <span>{formData.clinic_name}</span>
                  </div>
                </div>

                <div className="dietitian-detail-item">
                  <span className="detail-item-label">Practitioner ID</span>
                  <div className="detail-item-value">
                    <span className="dietitian-code-tag">{dietitian?.dietitian_code || 'DIET-2026-001'}</span>
                  </div>
                </div>

                <div className="dietitian-detail-item">
                  <span className="detail-item-label">Official Clinic Email</span>
                  <div className="detail-item-value">
                    <span>{formData.email}</span>
                  </div>
                </div>

                <div className="dietitian-detail-item">
                  <span className="detail-item-label">Contact Number</span>
                  <div className="detail-item-value">
                    <span>{formData.phone}</span>
                  </div>
                </div>
              </div>

              <div className="dietitian-card-actions">
                <button
                  type="button"
                  className="btn-ayur-primary"
                  onClick={() => setIsEditing(true)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <DashboardIcon name="edit" size={16} /> Edit Profile & Photo
                </button>
              </div>
            </div>
          ) : (
            /* Edit Form Mode */
            <form onSubmit={handleSaveProfile} className="dietitian-edit-form">
              {/* Photo Upload Row */}
              <div className="photo-upload-section">
                <div className="photo-upload-avatar-wrap">
                  <img
                    src={previewPhoto || '/images/dietitian-hero-doctor.jpg'}
                    alt="Preview"
                    className="photo-upload-avatar"
                  />
                  <label htmlFor="dietitian-photo-input" className="photo-upload-overlay" title="Upload new photo" style={{ pointerEvents: uploadingPhoto ? 'none' : 'auto' }}>
                    {uploadingPhoto ? (
                      <>
                        <DashboardIcon name="refresh-cw" size={16} className="ayur-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <DashboardIcon name="camera" size={16} />
                        <span>Change</span>
                      </>
                    )}
                  </label>
                  <input
                    id="dietitian-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    style={{ display: 'none' }}
                  />
                </div>
                <div className="photo-upload-instructions">
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--color-deep-slate)' }}>
                    Practitioner Profile Photograph
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-slate-muted)', lineHeight: 1.4 }}>
                    Upload a professional clinic photo. JPEG, PNG, or WebP up to 3 MB.
                  </p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <label htmlFor="dietitian-photo-input" className="btn-ayur-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
                      <DashboardIcon name="upload" size={13} /> Select File
                    </label>
                    {previewPhoto !== dietitian?.photo_url && (
                      <button
                        type="button"
                        className="btn-ayur-outline"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => {
                          setPreviewPhoto(dietitian?.photo_url || '/images/dietitian-hero-doctor.jpg');
                          setFormData((prev) => ({ ...prev, photo_url: dietitian?.photo_url || '' }));
                        }}
                      >
                        Reset Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid-2" style={{ marginTop: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Dr. Vaidya"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Professional Role / Title</label>
                  <input
                    type="text"
                    name="role"
                    className="form-input"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="e.g. Chief Clinical Dietitian"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ayurvedic & Clinical Qualifications</label>
                <input
                  type="text"
                  name="qualifications"
                  className="form-input"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  placeholder="e.g. BAMS, MD (Ayurveda), PGD Clinical Nutrition"
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Clinic Center Name</label>
                  <input
                    type="text"
                    name="clinic_name"
                    className="form-input"
                    value={formData.clinic_name}
                    onChange={handleInputChange}
                    placeholder="e.g. AyurDiet Integrative Health Clinic"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Direct Contact Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="modal-footer" style={{ padding: '1rem 0 0', marginTop: '1.25rem', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-ayur-outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-ayur-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <DashboardIcon name="refresh-cw" size={15} className="ayur-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <DashboardIcon name="check" size={15} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
