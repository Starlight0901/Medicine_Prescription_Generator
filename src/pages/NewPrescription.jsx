import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientSelectionModal from '../components/PatientSelectionModal';
import PrescriptionForm from '../components/PrescriptionForm';
import Card from '../components/ui/Card';
import { useSettings } from '../context/SettingsContext';
import { ROUTES } from '../data/constants';
import { getPatients, savePrescription } from '../services/apiService';
import { downloadPrescriptionPDF } from '../services/pdf';
import { generateId } from '../utils/idGenerator';
import { calculateAge, toISODateString } from '../utils/dateUtils';
import { buildPrescriptionPayload } from '../utils/prescriptionFormUtils';

function NewPrescription() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [refreshKey, setRefreshKey] = useState(0);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getPatients().then((loadedPatients) => {
      if (!cancelled) {
        setPatients(loadedPatients);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? null;

  function refreshPatients() {
    setRefreshKey((current) => current + 1);
  }

  function handlePatientSelected(patient) {
    setPatientId(patient.id);
    setIsPatientModalOpen(false);
  }

  async function handleSaveAndGeneratePdf(formValues) {
    const payload = buildPrescriptionPayload({
      ...formValues,
      patientId,
      patients,
    });

    if (!payload.success) {
      return payload;
    }

    setIsSubmitting(true);

    try {
      const result = await savePrescription({
        id: generateId('rx'),
        ...payload.data,
        createdAt: toISODateString(),
      });

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to save prescription.' };
      }

      const patient = patients.find((entry) => entry.id === result.data.patientId) ?? null;
      await downloadPrescriptionPDF({ prescription: result.data, settings, patient });
      navigate(ROUTES.HISTORY);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to generate PDF.',
      };
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="prescription-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Create Medical Document</h1>
          <p>Create a prescription, referral letter, or investigation request, save it to history, and download a PDF.</p>
        </div>
      </header>

      <Card className="glass-card--strong">
        <PrescriptionForm
          patients={patients}
          patientId={patientId}
          onPatientIdChange={setPatientId}
          patientField={
            <div className="prescription-patient-field">
              <label>Patient</label>
              {selectedPatient ? (
                <div className="selected-patient-summary">
                  <strong>{selectedPatient.name}</strong>
                  <span>
                    {calculateAge(selectedPatient.dateOfBirth) ?? '—'} yrs · {selectedPatient.gender}
                    {selectedPatient.phone ? ` · ${selectedPatient.phone}` : ''}
                  </span>
                </div>
              ) : (
                <p className="prescription-patient-empty">No patient selected.</p>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPatientModalOpen(true)}
              >
                {selectedPatient ? 'Change patient' : 'Select patient'}
              </button>
            </div>
          }
          onSubmit={handleSaveAndGeneratePdf}
          submitLabel="Save & Generate PDF"
          isSubmitting={isSubmitting}
        />
      </Card>

      {isPatientModalOpen && (
        <PatientSelectionModal
          patients={patients}
          onSelect={handlePatientSelected}
          onClose={() => setIsPatientModalOpen(false)}
          onPatientsChange={refreshPatients}
        />
      )}
    </section>
  );
}

export default NewPrescription;
