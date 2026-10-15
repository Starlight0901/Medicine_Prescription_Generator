import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { generateMedicalCertificatePDF } from '../services/pdf';
import { generateId } from '../utils/idGenerator';
import { resolveFieldDataType } from '../utils/certificateTemplateUtils';
import {
  SALUTATIONS,
  buildCertificatePdfRequest,
  calculateCalendarDayDifference,
  createCertificateValues,
  getTemplateFieldKeys,
  validateCertificateEntry,
} from '../utils/certificateFormUtils';
import CertificatePdfPreviewModal from './CertificatePdfPreviewModal';
import CertificateShareDialog from './CertificateShareDialog';

const REQUIRED_FIELD_KEYS = new Set([
  'salutation',
  'patientName',
  'certificateDate',
  'startDate',
  'endDate',
  'medicalStatement',
  'doctorName',
]);

function RequiredMark() {
  return <span className="certificate-required-mark" aria-hidden="true">*</span>;
}

function SalutationChoices({ value, onChange, readOnly = false, labelledBy }) {
  return (
    <div
      className="salutation-options"
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      {SALUTATIONS.map((option) => {
        const selected = value === option;

        return (
          <label
            key={option}
            className={`salutation-option${selected ? ' salutation-option--selected' : ''}`}
          >
            <input
              type="radio"
              name={readOnly ? 'certificate-salutation-preview' : 'certificate-salutation'}
              value={option}
              checked={selected}
              disabled={readOnly}
              onChange={() => onChange?.(option)}
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function downloadPdfFile(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return new File([blob], filename, { type: 'application/pdf' });
}

function CertificateEntryForm({
  template,
  patients,
  selectedPatient,
  onSelectPatient,
  onBack,
  onIssue,
  onFinished,
}) {
  const { settings, isSettingsReady } = useSettings();
  const [values, setValues] = useState(() => createCertificateValues(selectedPatient, settings));
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [nameFollowsPatient, setNameFollowsPatient] = useState(true);
  const [requestId] = useState(() => generateId('mcr'));
  const [savedRecord, setSavedRecord] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [previewSnapshot, setPreviewSnapshot] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const generatingRef = useRef(false);
  const followedPatientId = useRef(selectedPatient?.id ?? '');
  const fieldKeys = getTemplateFieldKeys(template);
  const dayDifference = calculateCalendarDayDifference(values.startDate, values.endDate);
  const duration = dayDifference != null && dayDifference >= 0 ? dayDifference : null;
  const dateRangeError = dayDifference != null && dayDifference < 0
    ? 'The end date cannot be earlier than the start date.'
    : '';

  useEffect(() => {
    if (followedPatientId.current === (selectedPatient?.id ?? '')) return;

    followedPatientId.current = selectedPatient?.id ?? '';
    setNameFollowsPatient(true);
    setValues((current) => ({
      ...current,
      patientName: selectedPatient?.name ?? '',
    }));
    setStatusMessage('');
  }, [selectedPatient]);

  useEffect(() => {
    if (!isSettingsReady) return;

    setValues((current) => ({
      ...current,
      doctorName: current.doctorName || settings.doctorName,
      clinicAddress: current.clinicAddress || settings.clinicAddress,
      clinicEmail: current.clinicEmail || settings.clinicEmail,
    }));
  }, [isSettingsReady, settings]);

  function updateValue(key, value) {
    if (key === 'patientName') {
      setNameFollowsPatient(false);
    }

    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key] && key !== 'startDate' && key !== 'endDate') return current;
      const next = { ...current };
      delete next[key];
      if (key === 'startDate' || key === 'endDate') {
        delete next.startDate;
        delete next.endDate;
      }
      return next;
    });
  }

  function updateCustomValue(key, value) {
    setValues((current) => ({
      ...current,
      fieldValues: { ...current.fieldValues, [key]: value },
    }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validatedEntry() {
    return validateCertificateEntry({ template, patient: selectedPatient, values });
  }

  function handlePreview(event) {
    event.preventDefault();
    const result = validatedEntry();

    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      setPreviewSnapshot(null);
      setStatusMessage('');
      return;
    }

    setErrors({});
    setPreviewSnapshot({
      template,
      values: result.value,
      settings: {
        doctorName: result.value.doctorName,
        clinicAddress: result.value.clinicAddress,
        clinicEmail: result.value.clinicEmail,
      },
    });
  }

  async function handleGenerate() {
    if (generatingRef.current || !onIssue) return;

    const result = validatedEntry();
    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      setStatusMessage('');
      return;
    }

    generatingRef.current = true;
    setIsGenerating(true);
    setDownloadError('');
    setErrors({});

    let record = savedRecord;

    try {
      if (!record) {
        const saved = await onIssue({
          clientRequestId: requestId,
          patientId: selectedPatient.id,
          templateId: template.id,
          values: result.value,
        });

        if (!saved?.success) {
          setDownloadError(saved?.error || 'Could not save the certificate.');
          if (saved?.errors) setErrors(saved.errors);
          return;
        }

        record = saved.data;
        setSavedRecord(saved.data);
      }

      const request = buildCertificatePdfRequest(record);
      const bytes = await generateMedicalCertificatePDF({
        template: request.template,
        values: request.values,
        settings: request.settings,
        createdAt: request.values.certificateDate
          ? new Date(`${request.values.certificateDate}T00:00:00.000Z`).toISOString()
          : new Date().toISOString(),
      });
      const safeName = String(request.values.patientName || 'patient')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'patient';
      const file = downloadPdfFile(bytes, `medical_certificate_${safeName}_${request.certificateNumber || 'certificate'}.pdf`);
      setShareFile(file);
      setStatusMessage('');
    } catch (error) {
      setDownloadError(
        record
          ? 'The certificate was saved, but the PDF was not downloaded. Choose Generate PDF again to download the saved certificate. A second record will not be created.'
          : (error?.message || 'Could not create the certificate PDF.')
      );
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }

  function renderField(block) {
    const error = errors[block.fieldKey];
    const inputId = `certificate-${block.fieldKey}`;

    const required = block.custom ? Boolean(block.required) : REQUIRED_FIELD_KEYS.has(block.fieldKey);

    if (block.fieldKey === 'salutation') {
      return (
        <div className="form-group" key={block.id}>
          <label id={`${inputId}-label`}>{block.label}{required && <RequiredMark />}</label>
          <SalutationChoices
            value={values.salutation}
            labelledBy={`${inputId}-label`}
            onChange={(option) => updateValue('salutation', option)}
          />
          {error && <p className="form-error">{error}</p>}
        </div>
      );
    }

    if (block.fieldKey === 'duration') {
      return (
        <div className="form-group" key={block.id}>
          <label htmlFor={inputId}>{block.label}</label>
          <input id={inputId} value={duration == null ? '' : String(duration)} readOnly />
          <p className="certificate-help-text">
            {!fieldKeys.has('startDate') || !fieldKeys.has('endDate')
              ? 'Add start and end date fields to this template to calculate duration.'
              : dateRangeError
                ? 'Duration stays blank until the end date is on or after the start date.'
                : duration == null
                  ? 'Enter both dates to calculate the duration.'
                  : `${duration} ${duration === 1 ? 'day' : 'days'}, counted from the start date to the end date.`}
          </p>
        </div>
      );
    }

    if (block.fieldKey === 'medicalStatement') {
      return (
        <div className="form-group" key={block.id}>
          <label htmlFor={inputId}>{block.label}{required && <RequiredMark />}</label>
          <textarea
            id={inputId}
            rows={4}
            value={values.medicalStatement}
            onChange={(event) => updateValue('medicalStatement', event.target.value)}
          />
          {error && <p className="form-error">{error}</p>}
        </div>
      );
    }

    if (block.fieldKey === 'startDate' || block.fieldKey === 'endDate' || block.fieldKey === 'certificateDate') {
      return (
        <div className="form-group" key={block.id}>
          <label htmlFor={inputId}>{block.label}{required && <RequiredMark />}</label>
          <input
            id={inputId}
            type="date"
            value={values[block.fieldKey]}
            min={block.fieldKey === 'endDate' ? values.startDate : undefined}
            onChange={(event) => updateValue(block.fieldKey, event.target.value)}
          />
          {block.fieldKey === 'certificateDate' && (
            <p className="certificate-help-text">This is the date the certificate is issued.</p>
          )}
          {(error || (block.fieldKey === 'endDate' && dateRangeError)) && (
            <p className="form-error">{error || dateRangeError}</p>
          )}
        </div>
      );
    }

    if (block.custom) {
      const dataType = resolveFieldDataType(block);
      const customValue = values.fieldValues?.[block.fieldKey] ?? '';

      return (
        <div className="form-group" key={block.id}>
          <label htmlFor={inputId}>
            {block.label}
            {required && <RequiredMark />}
            {block.required ? '' : ' (optional)'}
          </label>
          {dataType === 'longText' ? (
            <textarea
              id={inputId}
              rows={4}
              value={customValue}
              onChange={(event) => updateCustomValue(block.fieldKey, event.target.value)}
            />
          ) : (
            <input
              id={inputId}
              type={dataType === 'date' ? 'date' : dataType === 'text' ? 'text' : 'number'}
              inputMode={dataType === 'integer' ? 'numeric' : dataType === 'text' ? undefined : 'decimal'}
              step={dataType === 'integer' ? '1' : dataType === 'text' || dataType === 'date' ? undefined : '0.01'}
              value={customValue}
              onChange={(event) => updateCustomValue(block.fieldKey, event.target.value)}
            />
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      );
    }

    const isName = block.fieldKey === 'patientName';

    return (
      <div className="form-group" key={block.id}>
        <label htmlFor={inputId}>{block.label}{required && <RequiredMark />}</label>
        <input
          id={inputId}
          value={values[block.fieldKey] ?? ''}
          onChange={(event) => updateValue(block.fieldKey, event.target.value)}
        />
        {isName && (
          <p className="certificate-help-text">
            {nameFollowsPatient
              ? 'Filled from the selected patient. You can change the name printed on this certificate.'
              : 'This certificate will use the edited name. The patient record is unchanged.'}
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }

  return (
    <form className="certificate-entry-form" onSubmit={handlePreview}>
      <div className="certificate-section-header">
        <h2>{template.name}</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          Change template
        </button>
      </div>
      <p className="certificate-help-text">
        Complete the fields, preview the certificate if you want, then generate the PDF.
      </p>

      {!isSettingsReady && <p className="certificate-help-text">Loading clinic details…</p>}

      <div className="form-group">
        <label htmlFor="certificate-patient">Patient<RequiredMark /></label>
        <select
          id="certificate-patient"
          value={selectedPatient?.id ?? ''}
          onChange={(event) => onSelectPatient(event.target.value)}
        >
          <option value="">Select a patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
            </option>
          ))}
        </select>
        {errors.patient && <p className="form-error">{errors.patient}</p>}
      </div>

      {!fieldKeys.has('certificateDate') && (
        <div className="form-group">
          <label htmlFor="certificate-certificateDate">Issue date<RequiredMark /></label>
          <input
            id="certificate-certificateDate"
            type="date"
            value={values.certificateDate}
            onChange={(event) => updateValue('certificateDate', event.target.value)}
          />
          {errors.certificateDate && <p className="form-error">{errors.certificateDate}</p>}
        </div>
      )}

      {template.blocks.map((block) => {
        if (block.type === 'space') return null;

        if (block.type === 'heading') {
          return <h3 key={block.id} className="certificate-form-heading">{block.text}</h3>;
        }

        if (block.type === 'text') {
          return (
            <p key={block.id} className="certificate-form-text">
              {block.text}
            </p>
          );
        }

        return renderField(block);
      })}

      {statusMessage && <p className="status-message" role="status">{statusMessage}</p>}
      {downloadError && <p className="form-error">{downloadError}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={isGenerating || !isSettingsReady}>
          Preview Certificate
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isGenerating || !isSettingsReady}
        >
          {isGenerating ? 'Generating PDF…' : 'Generate PDF'}
        </button>
      </div>

      {previewSnapshot && (
        <CertificatePdfPreviewModal
          title="Certificate preview"
          note="This preview is not saved and does not use a certificate number."
          template={previewSnapshot.template}
          values={previewSnapshot.values}
          settings={previewSnapshot.settings}
          onClose={() => setPreviewSnapshot(null)}
        />
      )}
      {shareFile && (
        <CertificateShareDialog
          file={shareFile}
          onDone={() => {
            setShareFile(null);
            onFinished?.();
          }}
        />
      )}
    </form>
  );
}

export default CertificateEntryForm;
