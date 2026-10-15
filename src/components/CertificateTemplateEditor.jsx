import { useMemo, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { createSampleCertificateValues } from '../utils/certificateFormUtils';
import {
  FIELD_DATA_TYPES,
  SPACE_SIZES,
  TEMPLATE_CATEGORIES,
  collectFieldCatalog,
  createBlock,
  createFieldKey,
  describeBlock,
  findEquivalentField,
  normalizeBlocks,
  searchCertificateFields,
  validateTemplateInput,
} from '../utils/certificateTemplateUtils';
import CertificatePdfPreviewModal from './CertificatePdfPreviewModal';

function moveBlock(blocks, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= blocks.length) return blocks;

  const next = [...blocks];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function blockKind(block) {
  if (block.type === 'space') return 'Layout';
  if (block.type === 'heading') return 'Heading';
  if (block.type === 'text') return 'Text';
  return block.custom ? 'Custom field' : 'Field';
}

function CertificateTemplateEditor({
  initialTemplate = null,
  templates = [],
  onSave,
  onCancel,
  isSaving = false,
}) {
  const { settings } = useSettings();
  const [name, setName] = useState(initialTemplate?.name ?? '');
  const [category, setCategory] = useState(initialTemplate?.category ?? 'other');
  const [blocks, setBlocks] = useState(
    initialTemplate?.blocks?.length ? normalizeBlocks(initialTemplate.blocks) : [createBlock('heading')]
  );
  const [expandedId, setExpandedId] = useState('');
  const [showFieldSearch, setShowFieldSearch] = useState(false);
  const [fieldQuery, setFieldQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const savedKeys = useMemo(
    () => new Set((initialTemplate?.blocks ?? []).filter((block) => block.type === 'field').map((block) => block.fieldKey)),
    [initialTemplate]
  );
  const catalog = useMemo(() => collectFieldCatalog(templates), [templates]);
  const matches = searchCertificateFields(catalog, fieldQuery).slice(0, 8);
  const equivalentField = findEquivalentField(catalog, fieldQuery);
  const headingIndex = blocks.findIndex((block) => block.type === 'heading');

  function updateBlock(index, patch) {
    setBlocks((current) => current.map((block, blockIndex) => (
      blockIndex === index ? { ...block, ...patch } : block
    )));
  }

  function addBlock(block) {
    setBlocks((current) => [...current, block]);
    setExpandedId(block.id);
  }

  function addExistingField(field) {
    const used = new Set(blocks.filter((block) => block.type === 'field').map((block) => block.fieldKey));
    if (used.has(field.key)) {
      setMessage(`${field.label} is already in this template.`);
      return;
    }

    const block = createBlock('field');
    block.fieldKey = field.key;
    block.label = field.label;
    block.calculated = Boolean(field.calculated);
    block.custom = Boolean(field.custom);
    block.dataType = field.dataType;
    block.required = Boolean(field.required);
    addBlock(block);
    setShowFieldSearch(false);
    setFieldQuery('');
    setMessage('');
  }

  function addNewField(label) {
    const currentFields = blocks
      .filter((block) => block.type === 'field')
      .map((block) => ({ key: block.fieldKey, label: block.label }));
    const equivalent = findEquivalentField([...catalog, ...currentFields], label);
    if (equivalent) {
      addExistingField(equivalent);
      return;
    }

    const used = blocks.filter((block) => block.type === 'field').map((block) => block.fieldKey);
    const block = createBlock('field');
    block.fieldKey = createFieldKey(label, [...used, ...catalog.map((field) => field.key)]);
    block.label = label.trim().replace(/\s+/g, ' ');
    block.custom = true;
    block.dataType = 'text';
    block.required = false;
    block.calculated = false;
    addBlock(block);
    setShowFieldSearch(false);
    setFieldQuery('');
    setMessage('');
  }

  function currentTemplate() {
    return validateTemplateInput({ name, category, blocks });
  }

  function handlePreview() {
    const { errors: nextErrors, value } = currentTemplate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage('');
      return;
    }

    setErrors({});
    const previewSettings = {
      doctorName: settings?.doctorName || 'Dr. T Jayanthakumar',
      clinicAddress: settings?.clinicAddress || '12 Clinic Road',
      clinicEmail: settings?.clinicEmail || 'clinic@example.com',
    };
    setPreviewTemplate({
      template: value,
      values: createSampleCertificateValues(value, previewSettings),
      settings: previewSettings,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const { errors: nextErrors, value } = currentTemplate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage('');
      return;
    }

    setErrors({});
    const result = await onSave({
      id: initialTemplate?.id,
      ...value,
    });

    if (!result.success) {
      setMessage(result.error || 'Failed to save the template.');
      if (result.errors) setErrors(result.errors);
    }
  }

  return (
    <form className="certificate-template-form" onSubmit={handleSubmit}>
      <section>
        <h3 className="certificate-editor-heading">Template details</h3>
        <div className="form-group">
          <label htmlFor="template-name">Template name</label>
          <input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Medical leave for school"
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="template-category">Category</label>
          <select
            id="template-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {TEMPLATE_CATEGORIES.map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
          {errors.category && <p className="form-error">{errors.category}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="template-heading">Heading</label>
          <input
            id="template-heading"
            value={headingIndex >= 0 ? blocks[headingIndex].text : ''}
            onChange={(event) => {
              const text = event.target.value;
              if (headingIndex >= 0) {
                updateBlock(headingIndex, { text });
                return;
              }
              const block = createBlock('heading');
              block.text = text;
              setBlocks((current) => [block, ...current]);
            }}
          />
        </div>
      </section>

      <section>
        <h3 className="certificate-editor-heading">Certificate structure</h3>
        <div className="certificate-block-list">
          {blocks.map((block, index) => {
            const expanded = expandedId === block.id;
            const keyLocked = !block.custom || savedKeys.has(block.fieldKey) || catalog.some((field) => field.key === block.fieldKey && field.custom);

            return (
              <div key={block.id} className={`certificate-block${block.type === 'space' ? ' certificate-block--space' : ''}`}>
                <div className="certificate-block-toolbar">
                  <button
                    type="button"
                    className="certificate-structure-summary"
                    onClick={() => setExpandedId(expanded ? '' : block.id)}
                  >
                    <span>{blockKind(block)}</span>
                    <span>{describeBlock(block) || 'Empty'}</span>
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBlocks((current) => moveBlock(current, index, -1))} disabled={index === 0 || isSaving}>Move Up</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBlocks((current) => moveBlock(current, index, 1))} disabled={index === blocks.length - 1 || isSaving}>Move Down</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} disabled={isSaving}>Remove Element</button>
                </div>
                {expanded && (
                  <div className="certificate-field-config">
                    {block.type === 'space' && (
                      <div className="form-group">
                        <label htmlFor={`${block.id}-size`}>Spacing</label>
                        <select id={`${block.id}-size`} value={block.size} onChange={(event) => updateBlock(index, { size: event.target.value })}>
                          {SPACE_SIZES.map((size) => (
                            <option key={size.value} value={size.value}>{size.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {(block.type === 'heading' || block.type === 'text') && (
                      <div className="form-group">
                        <label htmlFor={`${block.id}-text`}>{block.type === 'heading' ? 'Heading' : 'Static text'}</label>
                        <textarea id={`${block.id}-text`} rows={block.type === 'heading' ? 2 : 3} value={block.text} onChange={(event) => updateBlock(index, { text: event.target.value })} />
                      </div>
                    )}
                    {block.type === 'field' && (
                      <>
                        <div className="form-group">
                          <label htmlFor={`${block.id}-label`}>Label</label>
                          <input id={`${block.id}-label`} value={block.label} onChange={(event) => updateBlock(index, { label: event.target.value })} />
                        </div>
                        {block.custom && (
                          <>
                            <div className="form-group">
                              <label htmlFor={`${block.id}-type`}>Data type</label>
                              <select id={`${block.id}-type`} value={block.dataType} onChange={(event) => updateBlock(index, { dataType: event.target.value })}>
                                {FIELD_DATA_TYPES.map((entry) => (
                                  <option key={entry.value} value={entry.value}>{entry.label}</option>
                                ))}
                              </select>
                            </div>
                            <label className="certificate-check-label" htmlFor={`${block.id}-required`}>
                              <input id={`${block.id}-required`} type="checkbox" checked={Boolean(block.required)} onChange={(event) => updateBlock(index, { required: event.target.checked })} />
                              Required
                            </label>
                            <div className="form-group">
                              <label htmlFor={`${block.id}-key`}>Field key</label>
                              <input
                                id={`${block.id}-key`}
                                value={block.fieldKey}
                                readOnly={keyLocked}
                                onChange={(event) => updateBlock(index, { fieldKey: event.target.value.trim().toLowerCase() })}
                              />
                            </div>
                          </>
                        )}
                        {block.calculated && (
                          <p className="certificate-help-text">Duration is calculated from the start and end dates.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {errors[`block-${index}`] && <p className="form-error">{errors[`block-${index}`]}</p>}
              </div>
            );
          })}
        </div>
        {errors.blocks && <p className="form-error">{errors.blocks}</p>}
        {errors.duration && <p className="form-error">{errors.duration}</p>}
        <div className="certificate-header-actions certificate-structure-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowFieldSearch((current) => !current); setFieldQuery(''); }} disabled={isSaving}>Add Existing Field</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addNewField('New field')} disabled={isSaving}>Create New Field</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addBlock(createBlock('text'))} disabled={isSaving}>Add Static Text</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addBlock(createBlock('heading'))} disabled={isSaving}>Add heading</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addBlock(createBlock('space'))} disabled={isSaving}>Keep Some Space</button>
        </div>
        {showFieldSearch && (
          <div className="certificate-field-picker">
            <label htmlFor="field-search">Search fields</label>
            <input id="field-search" value={fieldQuery} onChange={(event) => setFieldQuery(event.target.value)} placeholder="Type a field name" />
            <ul>
              {matches.map((field) => (
                <li key={field.key}>
                  <button type="button" onClick={() => addExistingField(field)}>
                    {field.label}
                    <span>{field.custom ? 'Custom' : 'Existing'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {fieldQuery.trim() && !equivalentField && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => addNewField(fieldQuery)}>
                Create new field: {fieldQuery.trim()}
              </button>
            )}
            {!fieldQuery.trim() && matches.length === 0 && (
              <p className="certificate-help-text">No fields are available yet.</p>
            )}
          </div>
        )}
      </section>

      {message && <p className="status-message" role="status">{message}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={handlePreview} disabled={isSaving}>Preview Template</button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Template'}</button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Cancel</button>
        )}
      </div>
      {previewTemplate && (
        <CertificatePdfPreviewModal
          title="Template preview"
          note="Sample values are shown. This preview is not saved."
          template={previewTemplate.template}
          values={previewTemplate.values}
          settings={previewTemplate.settings}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </form>
  );
}

export default CertificateTemplateEditor;
