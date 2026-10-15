import { useEffect, useMemo, useRef, useState } from 'react';
import CertificateHistoryDetail from '../components/CertificateHistoryDetail';
import PrescriptionDetail from '../components/PrescriptionDetail';
import PrescriptionForm from '../components/PrescriptionForm';
import Card from '../components/ui/Card';
import { NAV_ICONS } from '../components/NavIcons';
import { useSettings } from '../context/SettingsContext';
import {
  deleteMedicalCertificate,
  deletePrescription,
  getAllMedicalCertificates,
  getPatients,
  getPrescriptions,
  savePrescription,
} from '../services/apiService';
import { downloadIssuedCertificatePDF, downloadPrescriptionPDF } from '../services/pdf';
import { formatDate, toISODateString } from '../utils/dateUtils';
import { isMedicalCertificateRecord, toCertificateHistoryRecord } from '../utils/historyRecords';
import { generateId } from '../utils/idGenerator';
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
  const [repeatPrescription, setRepeatPrescription] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirmReady, setConfirmReady] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingRepeat, setIsSavingRepeat] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [menuOpensUp, setMenuOpensUp] = useState(false);
  const deletingRef = useRef(false);
  const menuRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const menuItemRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPatients(), getPrescriptions(), getAllMedicalCertificates()]).then(
      ([loadedPatients, loadedPrescriptions, certificateResult]) => {
        if (cancelled) return;

        const certificates = (certificateResult?.data ?? [])
          .map(toCertificateHistoryRecord)
          .filter((record) => record.id);

        setPatients(loadedPatients);
        setAllPrescriptions([...(loadedPrescriptions ?? []), ...certificates]);
        setHasLoaded(true);
        setLoadError(
          certificateResult?.success === false
            ? certificateResult.error || 'Could not load medical certificates.'
            : ''
        );
      }
    ).catch((error) => {
      if (cancelled) return;
      setHasLoaded(true);
      setLoadError(error?.message || 'Could not load history.');
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!pendingDelete) return undefined;

    const timer = window.setTimeout(() => setConfirmReady(true), 500);
    return () => window.clearTimeout(timer);
  }, [pendingDelete]);

  useEffect(() => {
    if (!openMenuKey) return undefined;

    menuItemRef.current?.focus();

    function closeOnOutside(event) {
      if (menuRef.current?.contains(event.target)) return;
      setOpenMenuKey(null);
    }

    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      setOpenMenuKey(null);
      menuTriggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenuKey]);

  useEffect(() => {
    setOpenMenuKey(null);
  }, [searchQuery, documentTypeFilter, dateFilter, refreshKey]);

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
    setOpenMenuKey(null);
    setEditingPrescription(null);
    setRepeatPrescription(null);
    setSelectedPrescriptionId((current) =>
      current === prescription.id ? null : prescription.id
    );
  }

  function closeModal() {
    setSelectedPrescriptionId(null);
    setEditingPrescription(null);
    setRepeatPrescription(null);
  }

  function formatHistoryDate(value) {
    if (!value || Number.isNaN(new Date(value).getTime())) return '—';
    return formatDate(value);
  }

  async function handleGeneratePdf(prescription) {
    setIsGeneratingPdf(true);
    setStatusMessage('');

    try {
      if (isMedicalCertificateRecord(prescription)) {
        await downloadIssuedCertificatePDF(prescription.certificate);
      } else {
        const patient = patients.find((entry) => entry.id === prescription.patientId) ?? null;
        await downloadPrescriptionPDF({ prescription, settings, patient });
      }
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

  function handleRepeat(prescription) {
    setRepeatPrescription(prescription);
    setEditingPrescription(null);
    setSelectedPrescriptionId(prescription.id);
    setStatusMessage('');
  }

  function handleCancelRepeat() {
    setRepeatPrescription(null);
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

  async function handleRepeatPrescription(formValues) {
    if (!repeatPrescription) {
      return { success: false, message: 'No prescription selected to repeat.' };
    }

    const payload = buildPrescriptionPayload({
      ...formValues,
      patients,
    });

    if (!payload.success) {
      return payload;
    }

    setIsSavingRepeat(true);

    try {
      const result = await savePrescription({
        id: generateId('rx'),
        ...payload.data,
        createdAt: formValues.createdAt ?? toISODateString(),
      });

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to create repeated prescription.' };
      }

      setAllPrescriptions((current) => [result.data, ...current]);
      refreshList();
      setRepeatPrescription(null);
      setSelectedPrescriptionId(result.data.id);
      setStatusMessage(`${getDocumentTypeLabel(result.data.type)} repeated successfully.`);
      return { success: true };
    } finally {
      setIsSavingRepeat(false);
    }
  }

  function historyDocumentLabel(record) {
    if (isMedicalCertificateRecord(record)) return 'Medical certificate';
    return getDocumentTypeLabel(record.type);
  }

  function historyRecordKey(record) {
    return `${record.recordKind || 'prescription'}-${record.id}`;
  }

  function toggleRecordMenu(record, event) {
    const key = historyRecordKey(record);
    if (openMenuKey === key) {
      setOpenMenuKey(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const bottomReserve = window.innerWidth < 900 ? 80 : 16;
    const spaceBelow = window.innerHeight - rect.bottom - bottomReserve;
    setMenuOpensUp(spaceBelow < 56);
    setOpenMenuKey(key);
  }

  function deleteFromMenu(record) {
    setOpenMenuKey(null);
    requestDelete(record);
  }

  function requestDelete(record) {
    if (deletingRef.current) return;
    setPendingDelete(record);
    setConfirmReady(false);
    setStatusMessage('');
    setStatusIsError(false);
  }

  function cancelDelete() {
    if (deletingRef.current) return;
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete || !confirmReady || deletingRef.current) return;

    deletingRef.current = true;
    setIsDeleting(true);
    const record = pendingDelete;
    const label = historyDocumentLabel(record);

    try {
      const result = isMedicalCertificateRecord(record)
        ? await deleteMedicalCertificate(record.id)
        : await deletePrescription(record.id);

      if (!result.success) {
        setStatusMessage(result.error || 'Could not delete the record.');
        setStatusIsError(true);
        return;
      }

      setAllPrescriptions((current) => current.filter((item) => (
        item.id !== record.id
        || (item.recordKind || 'prescription') !== (record.recordKind || 'prescription')
      )));
      if (selectedPrescriptionId === record.id) {
        setSelectedPrescriptionId(null);
        setEditingPrescription(null);
        setRepeatPrescription(null);
      }
      if (editingPrescription?.id === record.id) setEditingPrescription(null);
      if (repeatPrescription?.id === record.id) setRepeatPrescription(null);
      setPendingDelete(null);
      setStatusIsError(false);
      setStatusMessage(`${label} for ${record.patientName} was deleted. This cannot be undone.`);
      refreshList();
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
    }
  }

  async function handleDelete(prescription) {
    requestDelete(prescription);
  }

  return (
    <section className="history-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Prescription History</h1>
          <p>Browse, search, and filter issued prescriptions, referrals, investigations, and medical certificates.</p>
        </div>
      </header>

      {statusMessage && (
        <p className={`status-message${statusIsError ? ' status-message--error' : ''}`} role={statusIsError ? 'alert' : 'status'}>
          {statusMessage}
        </p>
      )}
      {loadError && (
        <p className="status-message status-message--error" role="alert">{loadError}</p>
      )}

      <Card className="history-filters">
        <div className="history-filter-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="history-search">Search</label>
            <input
              id="history-search"
              type="search"
              placeholder="Patient name or certificate details…"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSelectedPrescriptionId(null);
                setEditingPrescription(null);
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-document-type">Type</label>
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-year">Date</label>
            <div className="history-date-filter-stack">
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
            Clear
          </button>
        </div>
      </Card>

      <p className="history-summary">
        Showing {prescriptions.length} of {allPrescriptions.length} documents
      </p>

      {!hasLoaded ? (
        <Card>
          <div className="empty-state">Loading documents…</div>
        </Card>
      ) : prescriptions.length === 0 ? (
        <Card>
          <div className="empty-state">
            {allPrescriptions.length === 0
              ? 'No documents yet.'
              : 'No documents match your filters.'}
          </div>
        </Card>
      ) : (
        <ul className="history-list">
          {prescriptions.map((prescription) => {
            const isSelected = selectedPrescriptionId === prescription.id;
            const isCertificate = isMedicalCertificateRecord(prescription);
            const documentTypeBadge = isCertificate
              ? (prescription.templateName || 'Medical Certificate')
              : getDocumentTypeBadge(prescription.type);

            return (
              <li
                key={`${prescription.recordKind || 'prescription'}-${prescription.id}`}
                className={`history-row${openMenuKey === historyRecordKey(prescription) ? ' is-menu-open' : ''}`}
              >
                <button
                  type="button"
                  className={`history-item${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectPrescription(prescription)}
                  aria-expanded={isSelected}
                >
                  <span className="history-item-main">
                    <strong>{prescription.patientName}</strong>
                    <span>{formatHistoryDate(prescription.createdAt)}</span>
                  </span>
                  <span
                    className={
                      isCertificate
                        ? 'document-type-badge'
                        : `document-type-badge document-type-badge--${documentTypeBadge.toLowerCase()}`
                    }
                  >
                    [{documentTypeBadge}]
                  </span>
                  <span className="history-item-preview">
                    {getPrescriptionPreview(prescription)}
                  </span>
                </button>
                <div
                  className="history-card-menu"
                  ref={openMenuKey === historyRecordKey(prescription) ? menuRef : null}
                >
                  <button
                    type="button"
                    className="history-menu-btn"
                    ref={openMenuKey === historyRecordKey(prescription) ? menuTriggerRef : null}
                    aria-label="Record actions"
                    aria-haspopup="menu"
                    aria-expanded={openMenuKey === historyRecordKey(prescription)}
                    aria-controls={openMenuKey === historyRecordKey(prescription) ? 'history-record-menu' : undefined}
                    title="Record actions"
                    onClick={(event) => toggleRecordMenu(prescription, event)}
                  >
                    <span className="history-menu-icon" aria-hidden="true">{NAV_ICONS.more}</span>
                  </button>
                  {openMenuKey === historyRecordKey(prescription) && (
                    <div
                      id="history-record-menu"
                      className={`history-menu${menuOpensUp ? ' history-menu--up' : ''}`}
                      role="menu"
                      aria-label="Record actions"
                    >
                      <button
                        type="button"
                        className="history-menu-delete"
                        role="menuitem"
                        ref={menuItemRef}
                        onClick={() => deleteFromMenu(prescription)}
                      >
                        <span className="history-menu-delete-icon" aria-hidden="true">{NAV_ICONS.trash}</span>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedPrescription && (
        <div
          className="history-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="history-modal-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              isMedicalCertificateRecord(selectedPrescription) && !repeatPrescription && !editingPrescription
                ? 'certificate-history-title'
                : 'history-modal-title'
            }
          >
            {repeatPrescription ? (
              <Card className="history-edit-panel glass-card--strong">
                <div className="history-modal-header">
                  <div>
                    <h2 id="history-modal-title">Repeat {getDocumentTypeLabel(repeatPrescription.type).toLowerCase()}</h2>
                    <p>{repeatPrescription.patientName}</p>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={handleCancelRepeat}>
                    Cancel
                  </button>
                </div>
                <PrescriptionForm
                  key={repeatPrescription.id}
                  patients={patients}
                  initialPatientId={repeatPrescription.patientId}
                  initialDocumentType={repeatPrescription.type}
                  showDocumentTypeSelector={false}
                  initialDiagnosis={repeatPrescription.diagnosis}
                  initialMedicines={repeatPrescription.medicines}
                  initialNotes={repeatPrescription.notes}
                  initialReferralTitle={repeatPrescription.referralTitle}
                  initialReferralContent={repeatPrescription.referralContent}
                  initialInvestigationNotes={repeatPrescription.investigationNotes}
                  initialInvestigations={
                    repeatPrescription.investigations?.length > 0
                      ? repeatPrescription.investigations
                      : ['']
                  }
                  onSubmit={handleRepeatPrescription}
                  onCancel={handleCancelRepeat}
                  showDateField={true}
                  submitLabel="Save repeated document"
                  isSubmitting={isSavingRepeat}
                />
              </Card>
            ) : editingPrescription ? (
              <Card className="history-edit-panel glass-card--strong">
                <div className="history-modal-header">
                  <div>
                    <h2 id="history-modal-title">Edit {getDocumentTypeLabel(editingPrescription.type).toLowerCase()}</h2>
                    <p>{editingPrescription.patientName}</p>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
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
            ) : isMedicalCertificateRecord(selectedPrescription) ? (
              <CertificateHistoryDetail
                record={selectedPrescription}
                onClose={closeModal}
                onGeneratePdf={handleGeneratePdf}
                onDelete={requestDelete}
                isGeneratingPdf={isGeneratingPdf}
              />
            ) : (
              <PrescriptionDetail
                prescription={selectedPrescription}
                onClose={closeModal}
                onGeneratePdf={handleGeneratePdf}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRepeat={handleRepeat}
                isGeneratingPdf={isGeneratingPdf}
              />
            )}
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="history-modal-overlay history-delete-overlay" role="presentation">
          <div
            className="history-modal-dialog history-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-delete-title"
          >
            <h2 id="history-delete-title">Delete this {historyDocumentLabel(pendingDelete).toLowerCase()}?</h2>
            <p>
              {pendingDelete.patientName} · {formatHistoryDate(pendingDelete.createdAt)}
            </p>
            <p>This permanently deletes only this record. The patient, other documents, and certificate templates are kept.</p>
            {statusIsError && statusMessage && (
              <p className="form-error" role="alert">{statusMessage}</p>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting} autoFocus>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={isDeleting || !confirmReady}>
                {isDeleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default History;
