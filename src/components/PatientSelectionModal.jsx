import { useEffect, useMemo, useState } from 'react';
import PatientForm from './PatientForm';
import { getPatients, savePatient } from '../services/apiService';
import { calculateAge } from '../utils/dateUtils';

function filterPatientsByName(patients, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return patients;

  return patients.filter((patient) =>
    patient.name.toLowerCase().includes(normalizedQuery)
  );
}

function PatientSelectionModal({
  patients: patientsProp,
  onSelect,
  onClose,
  onPatientsChange,
  autoSelectOnCreate = true,
}) {
  const [view, setView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedPatientId, setHighlightedPatientId] = useState(null);
  const [patients, setPatients] = useState(patientsProp);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setPatients(patientsProp);
  }, [patientsProp]);

  const filteredPatients = useMemo(
    () => filterPatientsByName(patients, searchQuery),
    [patients, searchQuery]
  );

  const highlightedPatient =
    patients.find((patient) => patient.id === highlightedPatientId) ?? null;

  function refreshPatientList() {
    const refreshedPatients = getPatients();
    setPatients(refreshedPatients);
    onPatientsChange?.();
    return refreshedPatients;
  }

  function handleSelect(patient) {
    onSelect(patient);
    onClose();
  }

  function handleAddPatient(formData) {
    const result = savePatient(formData);

    if (!result.success) {
      return result;
    }

    refreshPatientList();
    setStatusMessage('');

    if (autoSelectOnCreate) {
      onSelect(result.data);
      onClose();
      return result;
    }

    setHighlightedPatientId(result.data.id);
    setView('list');
    setStatusMessage(`Patient "${result.data.name}" added.`);
    return result;
  }

  function handleEditPatient(formData) {
    const result = savePatient({ ...formData, id: highlightedPatient.id });

    if (!result.success) {
      return result;
    }

    refreshPatientList();
    setHighlightedPatientId(result.data.id);
    setView('list');
    setStatusMessage(`Patient "${result.data.name}" updated.`);
    return result;
  }

  function openAddView() {
    setStatusMessage('');
    setView('add');
  }

  function openEditView() {
    if (!highlightedPatient) return;
    setStatusMessage('');
    setView('edit');
  }

  function returnToList() {
    setStatusMessage('');
    setView('list');
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="modal-content patient-selection-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-selection-title"
      >
        <header className="modal-header">
          <h2 id="patient-selection-title">
            {view === 'add' && 'Add patient'}
            {view === 'edit' && 'Edit patient'}
            {view === 'list' && 'Select patient'}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {statusMessage && view === 'list' && (
          <p className="modal-status" role="status">
            {statusMessage}
          </p>
        )}

        {view === 'list' && (
          <>
            <div className="patient-selection-search">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="patient-modal-search">Search patients</label>
                <input
                  id="patient-modal-search"
                  type="search"
                  placeholder="Search by name…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="patient-selection-list" role="listbox" aria-label="Patients">
              {filteredPatients.length === 0 ? (
                <p className="patient-selection-empty">No patients found.</p>
              ) : (
                filteredPatients.map((patient) => {
                  const isHighlighted = patient.id === highlightedPatientId;

                  return (
                    <div
                      key={patient.id}
                      role="option"
                      aria-selected={isHighlighted}
                      className={`patient-selection-row${isHighlighted ? ' selected' : ''}`}
                      onClick={() => setHighlightedPatientId(patient.id)}
                    >
                      <div className="patient-selection-row-info">
                        <strong>{patient.name}</strong>
                        <span>
                          {calculateAge(patient.dateOfBirth) ?? '—'} yrs
                          {patient.gender ? ` · ${patient.gender}` : ''}
                          {patient.phone ? ` · ${patient.phone}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelect(patient);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={openAddView}>
                Add New Patient
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={openEditView}
                disabled={!highlightedPatient}
              >
                Edit Patient
              </button>
            </div>
          </>
        )}

        {view === 'add' && (
          <section className="patient-modal-form-panel">
            <PatientForm
              formIdPrefix="patient-modal-add"
              onSubmit={handleAddPatient}
              onCancel={returnToList}
              submitLabel="Save patient"
            />
          </section>
        )}

        {view === 'edit' && highlightedPatient && (
          <section className="patient-modal-form-panel">
            <PatientForm
              key={highlightedPatient.id}
              formIdPrefix="patient-modal-edit"
              initialValues={highlightedPatient}
              onSubmit={handleEditPatient}
              onCancel={returnToList}
              submitLabel="Save changes"
            />
          </section>
        )}
      </div>
    </div>
  );
}

export default PatientSelectionModal;
