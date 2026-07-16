import { useEffect, useMemo, useState } from 'react';
import PatientForm from '../components/PatientForm';
import Card, { CardBody } from '../components/ui/Card';
import {
  deletePatient,
  getPatients,
  savePatient,
} from '../services/apiService';
import { formatDate, resolvePatientAge } from '../utils/dateUtils';

const INITIAL_PATIENT_LIMIT = 8;

function filterPatientsByQuery(patients, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return patients;

  return patients.filter((patient) => {
    const name = String(patient.name ?? '').toLowerCase();
    const phone = String(patient.phone ?? '').toLowerCase();
    const patientId = String(patient.id ?? '').toLowerCase();

    return name.includes(normalizedQuery) || phone.includes(normalizedQuery) || patientId.includes(normalizedQuery);
  });
}

function Patients() {
  const [allPatients, setAllPatients] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_PATIENT_LIMIT);
  const [formMode, setFormMode] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    getPatients().then((loadedPatients) => {
      if (!cancelled) {
        setAllPatients(loadedPatients);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const patients = useMemo(
    () => filterPatientsByQuery(allPatients, query),
    [allPatients, query]
  );

  const visiblePatients = useMemo(() => patients.slice(0, visibleCount), [patients, visibleCount]);

  function refreshList() {
    setRefreshKey((current) => current + 1);
    setVisibleCount(INITIAL_PATIENT_LIMIT);
  }

  function openAddForm() {
    setEditingPatient(null);
    setFormMode('add');
    setStatusMessage('');
  }

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setVisibleCount(INITIAL_PATIENT_LIMIT);
  }

  function openEditForm(patient) {
    setEditingPatient(patient);
    setFormMode('edit');
    setStatusMessage('');
  }

  function closeForm() {
    setFormMode(null);
    setEditingPatient(null);
  }

  async function handleCreate(formData) {
    const result = await savePatient(formData);

    if (!result.success) {
      return result;
    }

    refreshList();
    closeForm();
    setStatusMessage('Patient added successfully.');
    return result;
  }

  async function handleUpdate(formData) {
    const result = await savePatient({ ...formData, id: editingPatient.id });

    if (!result.success) {
      return result;
    }

    refreshList();
    closeForm();
    setStatusMessage('Patient updated successfully.');
    return result;
  }

  async function handleDelete(patient) {
    const confirmed = window.confirm(`Delete patient "${patient.name}"?`);
    if (!confirmed) return;

    const result = await deletePatient(patient.id);

    if (!result.success) {
      setStatusMessage(result.error);
      return;
    }

    if (formMode === 'edit' && editingPatient?.id === patient.id) {
      closeForm();
    }

    refreshList();
    setStatusMessage('Patient deleted successfully.');
  }

  return (
    <section className="patients-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Patients</h1>
          <p>Add, edit, and manage patient records.</p>
        </div>
        {formMode !== 'add' && (
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            Add patient
          </button>
        )}
      </header>

      {statusMessage && (
        <p className="status-message" role="status">{statusMessage}</p>
      )}

      {formMode === 'add' && (
        <Card className="patients-panel">
          <h2>Add patient</h2>
          <PatientForm
            onSubmit={handleCreate}
            onCancel={closeForm}
            submitLabel="Add patient"
          />
        </Card>
      )}

      {formMode === 'edit' && editingPatient && (
        <Card className="patients-panel">
          <h2>Edit patient</h2>
          <PatientForm
            initialValues={editingPatient}
            onSubmit={handleUpdate}
            onCancel={closeForm}
            submitLabel="Save changes"
          />
        </Card>
      )}

      <Card>
        <CardBody>
          <div className="patients-toolbar">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="patient-search">Search patients</label>
              <input
                id="patient-search"
                type="search"
                placeholder="Search by name, phone, or ID…"
                value={query}
                onChange={handleSearchChange}
              />
            </div>
            <p className="patients-toolbar-hint">
              Showing {visiblePatients.length} of {patients.length} matching patients.
            </p>
          </div>

          {patients.length === 0 ? (
            <div className="empty-state">No patients found.</div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Phone</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePatients.map((patient) => (
                      <tr key={patient.id}>
                        <td data-label="Name">{patient.name}</td>
                        <td data-label="Age">{resolvePatientAge(patient) ?? '—'}</td>
                        <td data-label="Gender">{patient.gender}</td>
                        <td data-label="Phone">{patient.phone || '—'}</td>
                        <td data-label="Registered">{formatDate(patient.createdAt)}</td>
                        <td className="table-actions" data-label="Actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditForm(patient)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(patient)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {patients.length > visiblePatients.length && (
                <div className="patients-load-more">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setVisibleCount((current) => current + INITIAL_PATIENT_LIMIT)}
                  >
                    Load more patients
                  </button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

export default Patients;
