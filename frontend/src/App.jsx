import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from './components/layout/AppLayout';
import DashboardView from './components/dashboard/DashboardView';
import PatientDirectoryView from './components/patients/PatientDirectoryView';
import MealPlannerPage from './components/meals/MealPlannerPage';
import AiNutritionAssistant from './components/ai/AiNutritionAssistant';
import DietPlanPrintView from './components/reports/DietPlanPrintView';
import LandingPage from './components/landing/LandingPage';
import LoginView from './components/auth/LoginView';

// Existing clinical components
import PatientSidebar from './components/PatientSidebar';
import AssessmentForm from './components/AssessmentForm';
import NewPatientModal from './components/NewPatientModal';
import ClinicalLabModal from './components/ClinicalLabModal';
import RAGKnowledgeViewer from './components/RAGKnowledgeViewer';
import DietitianProfileModal from './components/profile/DietitianProfileModal';
import DashboardIcon from './components/ui/DashboardIcons';

import { api, tokenStorage } from './services/api';
import './styles/teal-tokens.css';
import './styles/premium-dashboard.css';
import './styles/hire-help-theme.css';

// Route path to internal route ID mapper
function parsePathToRoute(pathname) {
  const clean = pathname.replace(/\/$/, '') || '/';
  if (clean === '/') return 'landing';
  if (clean === '/login') return 'login';
  const sub = clean.replace(/^\//, '');
  const privateRoutes = ['dashboard', 'patients', 'clinical', 'meal-planner', 'ai-assistant', 'knowledge', 'reports'];
  return privateRoutes.includes(sub) ? sub : 'landing';
}

function routeToPath(route) {
  if (route === 'landing') return '/';
  if (route === 'login') return '/login';
  return `/${route}`;
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(() => parsePathToRoute(window.location.pathname));
  const [isAuthenticated, setIsAuthenticated] = useState(() => api.isAuthenticated());
  const [dietitian, setDietitian] = useState(() => api.getStoredDietitian());
  const [authChecking, setAuthChecking] = useState(true);

  // Clinical data state
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingLabRecord, setEditingLabRecord] = useState(null);
  const [showPatientSidebar, setShowPatientSidebar] = useState(false);
  const [toast, setToast] = useState(null);

  const handleUpdatePatientPhoto = (patientId, photoUrl) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, photo_url: photoUrl } : p))
    );
    if (activePatient && activePatient.id === patientId) {
      setActivePatient((prev) => ({ ...prev, photo_url: photoUrl }));
    }
    showToast('Patient clinical photo updated successfully.', 'success');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Safe navigation helper that updates browser URL and state
  const navigateTo = useCallback((targetRoute) => {
    const targetPath = routeToPath(targetRoute);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    setCurrentRoute(targetRoute);
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parsePathToRoute(window.location.pathname);
      setCurrentRoute(route);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Validate authentication state on application boot
  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      if (api.isAuthenticated()) {
        try {
          const res = await api.getCurrentUser();
          if (isMounted && res?.data?.dietitian) {
            setDietitian(res.data.dietitian);
            setIsAuthenticated(true);
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          tokenStorage.remove();
          if (isMounted) {
            setIsAuthenticated(false);
            setDietitian(null);
          }
        }
      } else {
        if (isMounted) {
          setIsAuthenticated(false);
          setDietitian(null);
        }
      }
      if (isMounted) setAuthChecking(false);
    };

    validateSession();

    // Listen for 401 unauthorized events from api.js
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setDietitian(null);
      showToast('Your clinical session has expired. Please log in again.', 'error');
      navigateTo('login');
    };

    window.addEventListener('ayurdiet:auth-expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('ayurdiet:auth-expired', handleAuthExpired);
    };
  }, [navigateTo]);

  // Route protection guard
  useEffect(() => {
    if (authChecking) return;

    const isPublicRoute = currentRoute === 'landing' || currentRoute === 'login';

    if (!isAuthenticated && !isPublicRoute) {
      // Unauthenticated visitor trying to access private route
      showToast('Authentication required. Please sign in to access clinical records.', 'error');
      navigateTo('login');
    } else if (isAuthenticated && currentRoute === 'login') {
      // Authenticated user already logged in trying to access login page
      navigateTo('dashboard');
    }
  }, [currentRoute, isAuthenticated, authChecking, navigateTo]);

  // Load patients from backend when authenticated
  const loadPatients = useCallback(async (search = '') => {
    if (!api.isAuthenticated()) return;

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
      // Suppress toast if unauthenticated redirect is already handling it
      if (err.status !== 401) {
        showToast('Could not load patient list from backend.', 'error');
      }
    } finally {
      setLoadingPatients(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatient]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPatients(searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, searchQuery]);

  // Select patient and load latest assessment, lab records, and saved plans independently
  const handleSelectPatient = async (patient) => {
    activePatientIdRef.current = patient.id;
    setActivePatient(patient);
    setActiveAssessment(null);
    setLabRecords([]);
    setSavedMealPlan(null);
    setSavedDietPlan(null);
    setShowPatientSidebar(false);

    try {
      setLoadingAssessment(true);

      const [assessmentResult, mealResult, dietResult] = await Promise.allSettled([
        api.getPatientAssessments(patient.id),
        api.getPatientMealPlans(patient.id),
        api.getPatientDietPlans(patient.id),
      ]);

      if (activePatientIdRef.current !== patient.id) {
        return;
      }

      // 1. Process Assessment & Lab data
      if (assessmentResult.status === 'fulfilled') {
        const assessments = assessmentResult.value?.data?.assessments || [];
        if (assessments.length > 0) {
          const latest = assessments[0];
          setActiveAssessment(latest);

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
      }

      // 2. Process Saved Meal Plans
      if (mealResult.status === 'fulfilled') {
        const mealPlans = mealResult.value?.data || [];
        if (Array.isArray(mealPlans) && mealPlans.length > 0) {
          setSavedMealPlan(mealPlans[0]);
        } else {
          setSavedMealPlan(null);
        }
      }

      // 3. Process Saved 7-Day Diet Plans
      if (dietResult.status === 'fulfilled') {
        const dietPlans = dietResult.value?.data || [];
        if (Array.isArray(dietPlans) && dietPlans.length > 0) {
          setSavedDietPlan(dietPlans[0]);
        } else {
          setSavedDietPlan(null);
        }
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
    try {
      const res = await api.createPatient(payload);
      const newPat = res.data?.patient;
      showToast(`Patient ${newPat?.name} registered (${newPat?.patient_code}).`, 'success');
      await loadPatients();
      if (newPat) {
        handleSelectPatient(newPat);
      }
    } catch (err) {
      console.error('Error creating patient:', err);
      showToast(err.message || 'Failed to register patient', 'error');
    }
  };

  // Save or Update Assessment
  const handleSaveAssessment = async (payload) => {
    if (!activePatient) return;

    try {
      if (activeAssessment && activeAssessment.id) {
        const res = await api.updateAssessment(activeAssessment.id, payload);
        const updated = res.data?.assessment;
        setActiveAssessment(updated);
        showToast('Patient assessment successfully updated.', 'success');
        await loadPatients(searchQuery);
      } else {
        const res = await api.createAssessment(activePatient.id, payload);
        const created = res.data?.assessment;
        setActiveAssessment(created);
        showToast('New patient assessment successfully created and saved.', 'success');
        await loadPatients(searchQuery);
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
      showToast(err.message || 'Failed to save assessment', 'error');
    }
  };

  // Save Lab Record
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

  // Authentication callbacks
  const handleLoginSuccess = (dietitianData) => {
    setIsAuthenticated(true);
    setDietitian(dietitianData);
    showToast(`Welcome back, ${dietitianData.name || 'Practitioner'}.`, 'success');
    navigateTo('dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      setIsAuthenticated(false);
      setDietitian(null);
      showToast('Signed out of clinical portal successfully.', 'success');
      navigateTo('landing');
    }
  };

  // Route metadata
  const routeMeta = {
    dashboard: {
      title: 'Clinical Dashboard',
      subtitle: 'Overview of patients, nutritional targets, and Ayurvedic protocols',
    },
    patients: {
      title: 'Patient Directory',
      subtitle: 'Manage, search, and review all registered clinic patients',
    },
    clinical: {
      title: 'Clinical Assessment',
      subtitle: '12-section holistic assessment, anthropometrics, and doshic constitution',
    },
    'meal-planner': {
      title: 'Ayurvedic Meal Planner',
      subtitle: 'Daily meal schedules, substitutions, and Gemini 7-day clinical diet plans',
    },
    'ai-assistant': {
      title: 'AI Clinical Nutritionist',
      subtitle: 'Interactive assistant powered by classical treatise citations (Charaka, Sushruta, CCRAS)',
    },
    knowledge: {
      title: 'Classical Ayurvedic Knowledge Base',
      subtitle: 'Grounded Hybrid RAG retrieval (Qdrant vectors + BM25 reciprocal rank fusion)',
    },
    reports: {
      title: 'Diet Reports & Prescriptions',
      subtitle: 'Print-ready patient diet schedules and Ahara Vidhi Vidhana guidelines',
    },
  };

  // 1. Public Landing Page Route (/)
  if (currentRoute === 'landing') {
    return (
      <>
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: toast.type === 'error' ? 'var(--color-error)' : 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
            >
              &times;
            </button>
          </div>
        )}
        <LandingPage onNavigateToLogin={() => navigateTo('login')} />
      </>
    );
  }

  // 2. Public Login Page Route (/login)
  if (currentRoute === 'login') {
    return (
      <>
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: toast.type === 'error' ? 'var(--color-error)' : 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
            >
              &times;
            </button>
          </div>
        )}
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onNavigateToLanding={() => navigateTo('landing')}
        />
      </>
    );
  }

  // 3. Protected Clinical Application Shell (/dashboard, /patients, /clinical, etc.)
  return (
    <AppLayout
      currentRoute={currentRoute}
      onRouteChange={navigateTo}
      title={routeMeta[currentRoute]?.title || 'AyurDiet'}
      subtitle={routeMeta[currentRoute]?.subtitle}
      activePatient={activePatient}
      onOpenNewPatientModal={() => setIsNewPatientOpen(true)}
      patientCount={patients.length}
      dietitian={dietitian}
      onOpenProfileModal={() => setIsProfileModalOpen(true)}
      onLogout={handleLogout}
    >
      {/* Toast Notification Banner */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: toast.type === 'error' ? 'var(--color-error)' : 'var(--color-primary)',
            color: '#FFFFFF',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.88rem',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1.1rem',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* View Switching */}
      {currentRoute === 'dashboard' && (
        <DashboardView
          patients={patients}
          activePatient={activePatient}
          onSelectPatient={handleSelectPatient}
          onNavigate={navigateTo}
          onOpenNewPatientModal={() => setIsNewPatientOpen(true)}
          dietitian={dietitian}
        />
      )}

      {currentRoute === 'patients' && (
        <PatientDirectoryView
          patients={patients}
          activePatient={activePatient}
          onSelectPatient={handleSelectPatient}
          onOpenNewPatientModal={() => setIsNewPatientOpen(true)}
          onNavigate={navigateTo}
          onUpdatePatientPhoto={handleUpdatePatientPhoto}
        />
      )}

      {currentRoute === 'clinical' && (
        <div className="clinical-workspace-container">
          <div
            className="clinical-workspace-split"
            style={{
              display: 'grid',
              gridTemplateColumns: (!showPatientSidebar && activePatient) ? '1fr' : 'minmax(280px, 320px) 1fr',
              gap: '1.5rem',
              minHeight: 'calc(100vh - 160px)',
              alignItems: 'start',
            }}
          >
            {/* Patient Selection Sidebar */}
            {(showPatientSidebar || !activePatient) && (
              <div
                style={{
                  background: 'var(--color-pure-white)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'sticky',
                  top: '85px',
                }}
              >
                <PatientSidebar
                  patients={patients}
                  activePatient={activePatient}
                  onSelectPatient={(p) => {
                    handleSelectPatient(p);
                    setShowPatientSidebar(false);
                  }}
                  onOpenNewPatientModal={() => setIsNewPatientOpen(true)}
                  onOpenKnowledgeBase={() => navigateTo('knowledge')}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  loading={loadingPatients}
                />
              </div>
            )}

            {/* Assessment Form Main Workspace */}
            <div
              style={{
                background: 'var(--color-pure-white)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-sm)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {activePatient ? (
                loadingAssessment ? (
                  <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-slate-muted)' }}>
                    Loading patient clinical assessment...
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
                    onSwitchPatient={() => setShowPatientSidebar((prev) => !prev)}
                    showPatientSidebar={showPatientSidebar}
                    onOpenNewPatientModal={() => setIsNewPatientOpen(true)}
                    onUpdatePatientPhoto={handleUpdatePatientPhoto}
                  />
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-slate-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                    <DashboardIcon name="clipboard-check" size={44} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--color-deep-slate)', marginBottom: '0.4rem' }}>
                    No Patient Selected
                  </h3>
                  <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem', fontSize: '0.9rem' }}>
                    Select an existing patient from the directory to conduct or review their clinical & Ayurvedic assessment, or register a new patient.
                  </p>
                  <button
                    type="button"
                    className="btn-ayur-primary"
                    onClick={() => setIsNewPatientOpen(true)}
                  >
                    + Register New Patient
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentRoute === 'meal-planner' && (
        <MealPlannerPage
          activePatient={activePatient}
          activeAssessment={activeAssessment}
          savedMealPlan={savedMealPlan}
          savedDietPlan={savedDietPlan}
          onMealPlanSaved={setSavedMealPlan}
          onDietPlanSaved={setSavedDietPlan}
          onNavigate={navigateTo}
        />
      )}

      {currentRoute === 'knowledge' && (
        <div
          style={{
            background: 'var(--color-pure-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <RAGKnowledgeViewer />
        </div>
      )}

      {currentRoute === 'ai-assistant' && (
        <AiNutritionAssistant activePatient={activePatient} />
      )}

      {currentRoute === 'reports' && (
        <DietPlanPrintView activePatient={activePatient} />
      )}

      {/* Modals */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onPatientCreated={handlePatientCreated}
      />

      <ClinicalLabModal
        isOpen={isLabModalOpen}
        onClose={() => {
          setIsLabModalOpen(false);
          setEditingLabRecord(null);
        }}
        onSave={handleSaveLabRecord}
        initialData={editingLabRecord}
      />

      <DietitianProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        dietitian={dietitian}
        onProfileUpdated={(updated) => {
          setDietitian(updated);
          showToast('Dietitian clinical profile updated successfully.');
        }}
      />
    </AppLayout>
  );
}
