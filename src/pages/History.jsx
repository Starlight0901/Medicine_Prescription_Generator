import { useEffect, useMemo, useState } from 'react';
import PrescriptionDetail from '../components/PrescriptionDetail';
import PrescriptionForm from '../components/PrescriptionForm';
import Card from '../components/ui/Card';
import { useSettings } from '../context/SettingsContext';
import {
  deletePrescription,
  getPatients,
  getPrescriptions,
  savePrescription,
} from '../services/apiService';
import { downloadPrescriptionPDF } from '../services/pdf';
import { formatDate } from '../utils/dateUtils';
import { buildPrescriptionPayload, getDocumentTypeBadge, getDocumentTypeLabel } from '../utils/prescriptionFormUtils';
import {
  applyPrescriptionFilters,
  DOCUMENT_TYPE_FILTER_OPTIONS,
  EMPTY_DATE_FILTER,
  extractDateFilterOptions,
  getPrescriptionPreview,
} from '../utils/prescriptionFilters';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function History() {
  const { settings } = useSettings();
  const [refreshKey, setRefreshKey] = useState(0);
  const [patients, setPatients] = useState([]);
  const [allPrescriptions, setAllPrescriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(EMPTY_DATE_FILTER);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPatients(), getPrescriptions()]).then(([loadedPatients, loadedPrescriptions]) => {
      if (!cancelled) {
        setPatients(loadedPatients);
        setAllPrescriptions(loadedPrescriptions);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const dateOptions = useMemo(
    () => extractDateFilterOptions(allPrescriptions),
    [allPrescriptions]
  );

  const prescriptions = useMemo(
    () =>
      applyPrescriptionFilters(allPrescriptions, {
        searchQuery,
        dateFilter,
        documentTypeFilter,
      }),
    [allPrescriptions, searchQuery, dateFilter, documentTypeFilter]
  );

  const selectedPrescription =
    prescriptions.find((prescription) => prescription.id === selectedPrescriptionId) ??
    allPrescriptions.find((prescription) => prescription.id === selectedPrescriptionId) ??
    null;

  function refreshList() {
    setRefreshKey((current) => current + 1);
  }

  function handleDateFilterChange(field, value) {
    setDateFilter((current) => ({ ...current, [field]: value }));
    setSelectedPrescriptionId(null);
    setEditingPrescription(null);
  }

  function clearFilters() {
    setSearchQuery('');
    setDocumentTypeFilter('');
    setDateFilter(EMPTY_DATE_FILTER);
    setSelectedPrescriptionId(null);
    setEditingPrescription(null);
  }

  function handleSelectPrescription(prescription) {
    setEditingPrescription(null);
    setSelectedPrescriptionId((current) =>
      current === prescription.id ? null : prescription.id
    );
  }

  async function handleGeneratePdf(prescription) {
    setIsGeneratingPdf(true);
    setStatusMessage('');

    try {
      const patient = patients.find((entry) => entry.id === prescription.patientId) ?? null;
      await downloadPrescriptionPDF({ prescription, settings, patient });
      setStatusMessage('PDF downloaded successfully.');
    } catch (error) {
      setStatusMessage(error.message || 'Failed to generate PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function handleEdit(prescription) {
    setEditingPrescription(prescription);
    setSelectedPrescriptionId(prescription.id);
    setStatusMessage('');
  }

  function handleCancelEdit() {
    setEditingPrescription(null);
  }

  async function handleUpdatePrescription(formValues) {
    if (!editingPrescription) {
      return { success: false, message: 'No prescription selected for editing.' };
    }

    const payload = buildPrescriptionPayload({
      ...formValues,
      patients,
      existingPrescription: editingPrescription,
    });

    if (!payload.success) {
      return payload;
    }

    setIsSavingEdit(true);

    try {
      const result = await savePrescription({
        id: editingPrescription.id,
        ...payload.data,
        createdAt: editingPrescription.createdAt,
      });

      if (!result.success) {
        return { success: false, message: result.error || 'Prescription not found.' };
      }

      refreshList();
      setEditingPrescription(null);
      setSelectedPrescriptionId(result.data.id);
      setStatusMessage(`${getDocumentTypeLabel(result.data.type)} updated successfully.`);
      return { success: true };
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(prescription) {
    const confirmed = window.confirm(
      `Delete ${getDocumentTypeLabel(prescription.type).toLowerCase()} for "${prescription.patientName}"?`
    );
    if (!confirmed) return;

    const result = await deletePrescription(prescription.id);

    if (!result.success) {
      setStatusMessage(result.error);
      return;
    }

    if (selectedPrescriptionId === prescription.id) {
      setSelectedPrescriptionId(null);
    }

    if (editingPrescription?.id === prescription.id) {
      setEditingPrescription(null);
    }

    refreshList();
    setStatusMessage(`${getDocumentTypeLabel(prescription.type)} deleted successfully.`);
  }

  return (
    <section className="history-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Prescription History</h1>
          <p>Browse, search, filter, and manage previously issued prescriptions.</p>
        </div>
      </header>

      {statusMessage && (
        <p className="status-message" role="status">{statusMessage}</p>
      )}

      <Card className="history-filters">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="history-search">Search by patient name</label>
          <input
            id="history-search"
            type="search"
            placeholder="Patient name…"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSelectedPrescriptionId(null);
              setEditingPrescription(null);
            }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="filter-document-type">Document type</label>
          <select
            id="filter-document-type"
            value={documentTypeFilter}
            onChange={(event) => {
              setDocumentTypeFilter(event.target.value);
              setSelectedPrescriptionId(null);
              setEditingPrescription(null);
            }}
          >
            {DOCUMENT_TYPE_FILTER_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="history-date-filters">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-year">Year</label>
            <select
              id="filter-year"
              value={dateFilter.year}
              onChange={(event) => handleDateFilterChange('year', event.target.value)}
            >
              <option value="">All years</option>
              {dateOptions.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-month">Month</label>
            <select
              id="filter-month"
              value={dateFilter.month}
              onChange={(event) => handleDateFilterChange('month', event.target.value)}
            >
              <option value="">All months</option>
              {dateOptions.months.map((month) => (
                <option key={month} value={month}>
                  {MONTH_LABELS[month - 1]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-day">Day</label>
            <select
              id="filter-day"
              value={dateFilter.day}
              onChange={(event) => handleDateFilterChange('day', event.target.value)}
            >
              <option value="">All days</option>
              {dateOptions.days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" className="btn btn-secondary" onClick={clearFilters}>
          Clear filters
        </button>
      </Card>

      <p className="history-summary">
        Showing {prescriptions.length} of {allPrescriptions.length} documents
      </p>

      {prescriptions.length === 0 ? (
        <Card>
          <div className="empty-state">No documents match your filters.</div>
        </Card>
      ) : (
        <ul className="history-list">
          {prescriptions.map((prescription) => {
            const isSelected = selectedPrescriptionId === prescription.id;
            const documentTypeBadge = getDocumentTypeBadge(prescription.type);

            return (
              <li key={prescription.id}>
                <button
                  type="button"
                  className={`history-item${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectPrescription(prescription)}
                  aria-expanded={isSelected}
                >
                  <span className="history-item-main">
                    <strong>{prescription.patientName}</strong>
                    <span>{formatDate(prescription.createdAt)}</span>
                  </span>
                  <span
                    className={`document-type-badge document-type-badge--${documentTypeBadge.toLowerCase()}`}
                  >
                    [{documentTypeBadge}]
                  </span>
                  <span className="history-item-preview">
                    {getPrescriptionPreview(prescription)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editingPrescription && (
        <Card className="history-edit-panel glass-card--strong">
          <h2>Edit {getDocumentTypeLabel(editingPrescription.type).toLowerCase()}</h2>
          <PrescriptionForm
            key={editingPrescription.id}
            patients={patients}
            initialPatientId={editingPrescription.patientId}
            initialDocumentType={editingPrescription.type}
            showDocumentTypeSelector={false}
            initialDiagnosis={editingPrescription.diagnosis}
            initialMedicines={editingPrescription.medicines}
            initialNotes={editingPrescription.notes}
            initialReferralTitle={editingPrescription.referralTitle}
            initialReferralContent={editingPrescription.referralContent}
            initialInvestigationNotes={editingPrescription.investigationNotes}
            initialInvestigations={
              editingPrescription.investigations?.length > 0
                ? editingPrescription.investigations
                : ['']
            }
            onSubmit={handleUpdatePrescription}
            onCancel={handleCancelEdit}
            submitLabel="Save changes"
            isSubmitting={isSavingEdit}
          />
        </Card>
      )}

      {selectedPrescription && !editingPrescription && (
        <PrescriptionDetail
          prescription={selectedPrescription}
          onClose={() => setSelectedPrescriptionId(null)}
          onGeneratePdf={handleGeneratePdf}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isGeneratingPdf={isGeneratingPdf}
        />
      )}
    </section>
  );
}

export default History;
