import { useMemo, useState } from 'react';
import PatientForm from '../components/PatientForm';
import Card, { CardBody } from '../components/ui/Card';
import {
  deletePatient,
  getPatients,
  savePatient,
} from '../services/apiService';
import { calculateAge, formatDate } from '../utils/dateUtils';

function filterPatientsByName(patients, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return patients;

  return patients.filter((patient) =>
    patient.name.toLowerCase().includes(normalizedQuery)
  );
}

function Patients() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const patients = useMemo(() => {
    void refreshKey;
    return filterPatientsByName(getPatients(), query);
  }, [query, refreshKey]);

  function refreshList() {
    setRefreshKey((current) => current + 1);
  }

  function openAddForm() {
    setEditingPatient(null);
    setFormMode('add');
    setStatusMessage('');
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

  function handleCreate(formData) {
    const result = savePatient(formData);

    if (!result.success) {
      return result;
    }

    refreshList();
    closeForm();
    setStatusMessage('Patient added successfully.');
    return result;
  }

  function handleUpdate(formData) {
    const result = savePatient({ ...formData, id: editingPatient.id });

    if (!result.success) {
      return result;
    }

    refreshList();
    closeForm();
    setStatusMessage('Patient updated successfully.');
    return result;
  }

  function handleDelete(patient) {
    const confirmed = window.confirm(`Delete patient "${patient.name}"?`);
    if (!confirmed) return;

    const result = deletePatient(patient.id);

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
              <label htmlFor="patient-search">Search by name</label>
              <input
                id="patient-search"
                type="search"
                placeholder="Search patients…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {patients.length === 0 ? (
            <div className="empty-state">No patients found.</div>
          ) : (
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
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td data-label="Name">{patient.name}</td>
                      <td data-label="Age">{calculateAge(patient.dateOfBirth) ?? '—'}</td>
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
          )}
        </CardBody>
      </Card>
    </section>
  );
}

export default Patients;
