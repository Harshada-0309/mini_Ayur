import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import DashboardIcon from '../ui/DashboardIcons';

export default function DietPlanPrintView({ activePatient }) {
  const [dietPlan, setDietPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!activePatient) return;
      try {
        setLoading(true);
        const res = await api.getPatientDietPlans(activePatient.id);
        const plans = res.data || [];
        if (plans.length > 0) {
          setDietPlan(plans[0]);
        }
      } catch (err) {
        console.error('Error loading diet plan for report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [activePatient]);

  return (
    <div className="ayur-card" style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem' }}>
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <img
            src="/images/ayurdiet-logo-horizontal.png"
            alt="AyurDiet"
            style={{ height: '46px', width: 'auto', objectFit: 'contain' }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-deep-slate)' }}>
              Clinical Diet Prescription & Report
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-slate-muted)' }}>
              AyurDiet Clinical Nutrition Center
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-ayur-primary"
          onClick={() => window.print()}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <DashboardIcon name="file-text" size={15} />
          <span>Print Prescription</span>
        </button>
      </div>

      {activePatient ? (
        <div>
          {/* Patient Demographic Summary Strip */}
          <div
            style={{
              backgroundColor: 'var(--color-pearl-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-slate-muted)', display: 'block' }}>Patient Name:</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--color-deep-slate)' }}>{activePatient.name}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-slate-muted)', display: 'block' }}>Patient ID:</span>
              <strong>{activePatient.patient_code}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-slate-muted)', display: 'block' }}>Age / Sex:</span>
              <strong>{activePatient.age} yrs / {activePatient.sex}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-slate-muted)', display: 'block' }}>Constitution (Prakriti):</span>
              <strong style={{ color: 'var(--color-primary)' }}>
                {activePatient.latest_assessment?.prakriti || 'Assessed'}
              </strong>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate-muted)' }}>
              Loading patient diet plan report...
            </div>
          ) : dietPlan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: 'var(--color-deep-slate)', fontSize: '1.1rem', marginBottom: '0.4rem' }}>
                  {dietPlan.title || '7-Day Personalized Ayurvedic Diet Plan'}
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-slate-muted)', lineHeight: 1.6 }}>
                  {dietPlan.patient_summary || dietPlan.clinical_rationale}
                </p>
              </div>

              {/* General Ayurvedic Principles */}
              {dietPlan.ayurvedic_dietary_principles && (
                <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-soft-aqua-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-soft-aqua)' }}>
                  <strong style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    <DashboardIcon name="sprout" size={15} />
                    <span>Ahara Vidhi Vidhana (Ayurvedic Eating Guidelines):</span>
                  </strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-deep-slate)', lineHeight: 1.5, margin: 0 }}>
                    {dietPlan.ayurvedic_dietary_principles}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {dietPlan.general_instructions && (
                <div>
                  <h5 style={{ fontSize: '0.95rem', color: 'var(--color-deep-slate)', marginBottom: '0.4rem' }}>
                    General Patient Instructions
                  </h5>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-muted)', lineHeight: 1.6 }}>
                    {dietPlan.general_instructions}
                  </p>
                </div>
              )}

              {/* Prescription Sign-off */}
              <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-muted)' }}>
                  Prescribed via AyurDiet Clinical System • Status: <strong>{dietPlan.is_approved ? 'Approved by Dietitian' : 'Clinical Draft'}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ borderBottom: '1px solid var(--color-deep-slate)', width: '160px', marginBottom: '0.25rem' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-muted)' }}>Dr. Vaidya (Signature)</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate-muted)' }}>
              No 7-day diet plan has been generated for this patient yet. Open the <strong>Clinical Assessment</strong> workspace to generate one.
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate-muted)' }}>
          Please select a patient from the directory or clinical workspace to generate a printable prescription.
        </div>
      )}
    </div>
  );
}
