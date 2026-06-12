import { useState } from 'react';
import { toDateInputValue } from '../utils/dateUtils';

export const EMPTY_PATIENT_FORM = {
  name: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

function PatientForm({
  initialValues = EMPTY_PATIENT_FORM,
  onSubmit,
  onCancel,
  submitLabel = 'Save patient',
  formIdPrefix = 'patient',
}) {
  const fieldId = (name) => `${formIdPrefix}-${name}`;
  const [formData, setFormData] = useState({
    ...EMPTY_PATIENT_FORM,
    ...initialValues,
    dateOfBirth: toDateInputValue(initialValues.dateOfBirth),
    phone: initialValues.phone ?? '',
  });
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await onSubmit(formData);

    if (result?.errors) {
      setErrors(result.errors);
    }
  }

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor={fieldId('name')}>Name (required)</label>
        <input
          id={fieldId('name')}
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Full name"
        />
        {errors.name && <p className="form-error">{errors.name}</p>}
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('dateOfBirth')}>Date of birth (required)</label>
        <input
          id={fieldId('dateOfBirth')}
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleChange}
          max={new Date().toISOString().slice(0, 10)}
        />
        {errors.dateOfBirth && <p className="form-error">{errors.dateOfBirth}</p>}
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('gender')}>Gender</label>
        <select
          id={fieldId('gender')}
          name="gender"
          value={formData.gender}
          onChange={handleChange}
        >
          <option value="">Select gender</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.gender && <p className="form-error">{errors.gender}</p>}
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('phone')}>Phone (optional)</label>
        <input
          id={fieldId('phone')}
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Phone number"
        />
        {errors.phone && <p className="form-error">{errors.phone}</p>}
      </div>

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default PatientForm;
