import { useState } from 'react';
import {
  MAX_AGE,
  MIN_AGE,
  resolveInitialPatientAge,
  validateAgeInput,
} from '../utils/patientUtils';

export const EMPTY_PATIENT_FORM = {
  name: '',
  age: '',
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
    name: initialValues.name ?? '',
    age: resolveInitialPatientAge(initialValues),
    gender: initialValues.gender ?? '',
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

    const nextErrors = {};

    if (!String(formData.name ?? '').trim()) {
      nextErrors.name = 'Name is required.';
    }

    const ageError = validateAgeInput(formData.age);
    if (ageError) {
      nextErrors.age = ageError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const age = Number(formData.age);

    const result = await onSubmit({
      name: formData.name,
      age,
      gender: formData.gender,
      phone: formData.phone,
    });

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
        <label htmlFor={fieldId('age')}>Age (required)</label>
        <input
          id={fieldId('age')}
          name="age"
          type="number"
          inputMode="numeric"
          min={MIN_AGE}
          max={MAX_AGE}
          step={1}
          value={formData.age}
          onChange={handleChange}
          placeholder="Age in years"
        />
        {errors.age && <p className="form-error">{errors.age}</p>}
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
