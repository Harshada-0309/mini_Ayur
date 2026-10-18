import React, { useState } from 'react';
import Badge from '../ui/Badge';
import DashboardIcon from '../ui/DashboardIcons';
import { api } from '../../services/api';

export default function PatientDirectoryView({
  patients = [],
  activePatient,
  onSelectPatient,
  onOpenNewPatientModal,
  onNavigate,
  onUpdatePatientPhoto,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDosha, setSelectedDosha] = useState('all');
  const [uploadingId, setUploadingId] = useState(null);

  const handlePhotoUpload = async (e, patientId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Patient photo size must be less than 5 MB.');
      return;
    }

    try {
      setUploadingId(patientId);
      const res = await api.uploadPatientPhoto(patientId, file);
      const newPhotoUrl = res.data?.photo_url;
      if (newPhotoUrl && onUpdatePatientPhoto) {
        onUpdatePatientPhoto(patientId, newPhotoUrl);
      }
    } catch (err) {
      console.error('Failed to save patient photo:', err);
      alert(err.message || 'Failed to save patient photo.');
    } finally {
      setUploadingId(null);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.patient_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone || '').includes(searchTerm) ||
      (p.occupation || '').toLowerCase().includes(searchTerm.toLowerCase());

    const prakriti = p.latest_assessment?.prakriti || '';
    const matchesDosha =
      selectedDosha === 'all' ||
      (selectedDosha === 'vata' && prakriti.includes('Vata')) ||
      (selectedDosha === 'pitta' && prakriti.includes('Pitta')) ||
      (selectedDosha === 'kapha' && prakriti.includes('Kapha')) ||
      (selectedDosha === 'pending' && !prakriti);

    return matchesSearch && matchesDosha;
  });

  return (
    <div className="ayur-patients-view">
      {/* Search and Filter Strip */}
      <div className="ayur-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-light)', display: 'flex' }}>
              <DashboardIcon name="search" size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name, ID code, phone, or occupation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                color: 'var(--color-deep-slate)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color var(--duration-fast)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Dosha Filter Chips */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'vata', 'pitta', 'kapha', 'pending'].map((filter) => {
              const active = selectedDosha === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedDosha(filter)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: active ? 'var(--color-soft-aqua-light)' : 'var(--color-pure-white)',
                    color: active ? 'var(--color-primary)' : 'var(--color-deep-slate)',
                    textTransform: 'capitalize',
                    transition: 'all var(--duration-fast)',
                  }}
                >
                  {filter === 'all' ? 'All Patients' : filter === 'pending' ? 'Pending Review' : `${filter} Dominant`}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-ayur-primary"
            onClick={onOpenNewPatientModal}
          >
            <DashboardIcon name="user-plus" size={16} />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Patients Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredPatients.map((patient) => {
          const isSelected = activePatient && activePatient.id === patient.id;
          const prakriti = patient.latest_assessment?.prakriti;
          const dietGoal = patient.latest_assessment?.diet_goal;

          return (
            <div
              key={patient.id}
              className="ayur-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                borderWidth: isSelected ? '2px' : '1px',
                cursor: 'pointer',
                transition: 'transform var(--duration-fast) var(--ease-spring), box-shadow var(--duration-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lift)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {patient.photo_url ? (
                        <img
                          src={patient.photo_url}
                          alt={patient.name}
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-primary)' }}
                        />
                      ) : (
                        <div className="ayur-patient-avatar-mini" style={{ width: '44px', height: '44px', fontSize: '1rem' }}>
                          {patient.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label
                        htmlFor={`dir-photo-${patient.id}`}
                        title="Upload patient photo"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          border: '1.5px solid #FFFFFF',
                        }}
                      >
                        {uploadingId === patient.id ? (
                          <DashboardIcon name="refresh-cw" size={10} className="ayur-spin" />
                        ) : (
                          <DashboardIcon name="camera" size={10} />
                        )}
                      </label>
                      <input
                        id={`dir-photo-${patient.id}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handlePhotoUpload(e, patient.id)}
                      />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-deep-slate)' }}>
                        {patient.name}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {patient.patient_code}
                      </span>
                    </div>
                  </div>

                  {prakriti ? (
                    <Badge variant={prakriti.includes('Vata') ? 'vata' : prakriti.includes('Pitta') ? 'pitta' : 'kapha'}>
                      {prakriti}
                    </Badge>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-slate-light)', background: 'var(--color-pearl-white)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      Pending Assessment
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--color-slate-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', margin: '0.75rem 0' }}>
                  <div>Age: <strong>{patient.age} yrs</strong></div>
                  <div>Sex: <strong style={{ textTransform: 'capitalize' }}>{patient.sex}</strong></div>
                  <div>Phone: <strong>{patient.phone || 'N/A'}</strong></div>
                  <div>Occ: <strong>{patient.occupation || 'N/A'}</strong></div>
                </div>

                {dietGoal && (
                  <div style={{ margin: '0.5rem 0', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--color-slate-muted)' }}>Target: </span>
                    <strong style={{ color: 'var(--color-primary)' }}>{dietGoal.replace(/_/g, ' ')}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                <button
                  type="button"
                  className="btn-ayur-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={() => {
                    onSelectPatient(patient);
                    onNavigate('clinical');
                  }}
                >
                  <span>Conduct Assessment</span>
                  <DashboardIcon name="arrow-right" size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredPatients.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--color-slate-muted)' }}>
            No patients found matching your search and filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
