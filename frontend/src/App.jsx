import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import PatientSidebar from './components/PatientSidebar';
import NewPatientModal from './components/NewPatientModal';
import AssessmentForm from './components/AssessmentForm';
import ClinicalLabModal from './components/ClinicalLabModal';
import RAGKnowledgeViewer from './components/RAGKnowledgeViewer';
import { api } from './services/api';

export default function App() {
  const [currentWorkspace, setCurrentWorkspace] = useState('clinical'); // 'clinical' | 'knowledge'
  const [patients, setPatients] = useState([]);
  const [activePatient, setActivePatient] = useState(null);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [labRecords, setLabRecords] = useState([]);
  const [savedMealPlan, setSavedMealPlan] = useState(null);
  const [savedDietPlan, setSavedDietPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const activePatientIdRef = useRef(null);

  // Modals state
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [editingLabRecord, setEditingLabRecord] = useState(null);

  // Notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Load patients
  const loadPatients = async (search = '') => {
    try {
      setLoadingPatients(true);
      const res = await api.getPatients(search);
      const list = res.data?.patients || [];
      setPatients(list);

      // If active patient is still in list, refresh it
      if (activePatient) {
        const refreshed = list.find((p) => p.id === activePatient.id);
        if (refreshed) setActivePatient(refreshed);
      } else if (list.length > 0 && !search) {
        // Auto select first patient
        handleSelectPatient(list[0]);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      showToast('Could not load patient list from backend.', 'error');
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadPatients(searchQuery);
  }, [searchQuery]);

  // Select patient and load latest assessment, lab records, and saved plans independently
  const handleSelectPatient = async (patient) => {
    activePatientIdRef.current = patient.id;
    setActivePatient(patient);
    setActiveAssessment(null);
    setLabRecords([]);
    setSavedMealPlan(null);
    setSavedDietPlan(null);

    try {
      setLoadingAssessment(true);

      const [assessmentResult, mealResult, dietResult] = await Promise.allSettled([
        api.getPatientAssessments(patient.id),
        api.getPatientMealPlans(patient.id),
        api.getPatientDietPlans(patient.id),
      ]);

      // Guard against stale response if patient selection switched while awaiting
      if (activePatientIdRef.current !== patient.id) {
        return;
      }

      // 1. Process Assessment & Lab data
      if (assessmentResult.status === 'fulfilled') {
        const assessments = assessmentResult.value?.data?.assessments || [];
        if (assessments.length > 0) {
          const latest = assessments[0];
          setActiveAssessment(latest);

          // Fetch lab records for latest assessment independently
          try {
            const labRes = await api.getLabData(latest.id);
            if (activePatientIdRef.current === patient.id) {
              setLabRecords(labRes.data?.labData || []);
            }
          } catch (labErr) {
            console.error('Error loading lab data for assessment:', labErr);
          }
        }
      } else {
        console.error('Error loading patient assessment:', assessmentResult.reason);
        showToast('Failed to load assessment for selected patient.', 'error');
      }

      // 2. Process Saved Meal Plans (prefer most recent plan)
      if (mealResult.status === 'fulfilled') {
        const mealPlans = mealResult.value?.data || [];
        if (Array.isArray(mealPlans) && mealPlans.length > 0) {
          setSavedMealPlan(mealPlans[0]);
        } else {
          setSavedMealPlan(null);
        }
      } else {
        console.error('Error loading saved meal plans:', mealResult.reason);
      }

      // 3. Process Saved 7-Day Diet Plans (prefer most recent plan)
      if (dietResult.status === 'fulfilled') {
        const dietPlans = dietResult.value?.data || [];
        if (Array.isArray(dietPlans) && dietPlans.length > 0) {
          setSavedDietPlan(dietPlans[0]);
        } else {
          setSavedDietPlan(null);
        }
      } else {
        console.error('Error loading saved 7-day diet plans:', dietResult.reason);
      }
    } catch (err) {
      console.error('Unexpected error loading patient details:', err);
      showToast('Error loading patient details.', 'error');
    } finally {
      if (activePatientIdRef.current === patient.id) {
        setLoadingAssessment(false);
      }
    }
  };

  // Register new patient
  const handlePatientCreated = async (payload) => {
    const res = await api.createPatient(payload);
    const newPat = res.data?.patient;
    showToast(`Patient ${newPat.name} registered (${newPat.patient_code}).`, 'success');
    await loadPatients();
    if (newPat) {
      handleSelectPatient(newPat);
    }
  };

  // Save or Update Assessment
  const handleSaveAssessment = async (payload) => {
    if (!activePatient) return;

    if (activeAssessment && activeAssessment.id) {
      // Update
      const res = await api.updateAssessment(activeAssessment.id, payload);
      const updated = res.data?.assessment;
      setActiveAssessment(updated);
      showToast('Patient assessment successfully updated.', 'success');
      await loadPatients(searchQuery);
    } else {
      // Create
      const res = await api.createAssessment(activePatient.id, payload);
      const created = res.data?.assessment;
      setActiveAssessment(created);
      showToast('New patient assessment successfully created and saved.', 'success');
      await loadPatients(searchQuery);
    }
  };

  // Save Lab Record (Add or Update)
  const handleSaveLabRecord = async (labData) => {
    if (!activeAssessment || !activeAssessment.id) {
      showToast('Please save the patient assessment first.', 'error');
      return;
    }

    try {
      if (editingLabRecord) {
        await api.updateLabData(editingLabRecord.id, labData);
        showToast('Clinical lab test updated.', 'success');
      } else {
        await api.addLabData(activeAssessment.id, labData);
        showToast('Clinical lab test added.', 'success');
      }

      // Refresh lab records
      const labRes = await api.getLabData(activeAssessment.id);
      setLabRecords(labRes.data?.labData || []);
      setEditingLabRecord(null);
    } catch (err) {
      console.error('Error saving lab record:', err);
      showToast(err.message || 'Failed to save lab data record', 'error');
    }
  };

  // Delete Lab Record
  const handleDeleteLabRecord = async (labId) => {
    if (!window.confirm('Are you sure you want to remove this lab test record?')) return;

    try {
      await api.deleteLabData(labId);
      showToast('Clinical record deleted.', 'success');
      setLabRecords((prev) => prev.filter((item) => item.id !== labId));
    } catch (err) {
      console.error('Error deleting lab record:', err);
      showToast(err.message || 'Failed to delete lab record', 'error');
    }
  };

  return (
    <div className="app-container">
      <Header
        activePatient={activePatient}
        currentWorkspace={currentWorkspace}
        onWorkspaceChange={setCurrentWorkspace}
      />

      <div className="workspace-layout">
        {/* Patient Selection Sidebar (Shown in clinical workspace) */}
        {currentWorkspace === 'clinical' && (
          <PatientSidebar
            patients={patients}
            activePatient={activePatient}
            onSelectPatient={handleSelectPatient}
            onOpenNewPatientModal={() => setIsNewPatientOpen(true)}
            onOpenKnowledgeBase={() => setCurrentWorkspace('knowledge')}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loadingPatients}
          />
        )}

        {/* Main Workspace (Clinical Assessment or Standalone Ayurvedic Knowledge Base) */}
        <main className={`main-workspace ${currentWorkspace === 'knowledge' ? 'knowledge-workspace' : ''}`}>
          {toast && (
            <div className={`toast-banner toast-${toast.type}`}>
              <span>{toast.message}</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => setToast(null)}
              >
                &times;
              </button>
            </div>
          )}

          {currentWorkspace === 'knowledge' ? (
            <RAGKnowledgeViewer />
          ) : activePatient ? (
            loadingAssessment ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#788d84' }}>
                Loading clinical and Ayurvedic assessment...
              </div>
            ) : (
              <AssessmentForm
                patient={activePatient}
                existingAssessment={activeAssessment}
                onSaveAssessment={handleSaveAssessment}
                onOpenLabModal={() => {
                  setEditingLabRecord(null);
                  setIsLabModalOpen(true);
                }}
                onEditLabRecord={(item) => {
                  setEditingLabRecord(item);
                  setIsLabModalOpen(true);
                }}
                onDeleteLabRecord={handleDeleteLabRecord}
                labRecords={labRecords}
                savedMealPlan={savedMealPlan}
                savedDietPlan={savedDietPlan}
                onMealPlanSaved={setSavedMealPlan}
                onDietPlanSaved={setSavedDietPlan}
              />
            )
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: '#0f2d23' }}>
                No Patient Selected
              </h3>
              <p style={{ maxWidth: '420px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                Select an existing patient from the left directory to conduct or review their clinical & Ayurvedic assessment, or register a new patient.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsNewPatientOpen(true)}
              >
                + Register New Patient
              </button>
            </div>
          )}
        </main>
      </div>

      {/* New Patient Registration Modal */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onPatientCreated={handlePatientCreated}
      />

      {/* Clinical Lab Test Modal (Optional Section 9) */}
      <ClinicalLabModal
        isOpen={isLabModalOpen}
        onClose={() => {
          setIsLabModalOpen(false);
          setEditingLabRecord(null);
        }}
        onSave={handleSaveLabRecord}
        initialData={editingLabRecord}
      />
    </div>
  );
}
