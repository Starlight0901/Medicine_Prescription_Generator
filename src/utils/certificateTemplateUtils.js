export const TEMPLATE_CATEGORIES = [
  { value: 'medical-leave', label: 'Medical Leave Certificate' },
  { value: 'medical-fitness', label: 'Medical Fitness Certificate' },
  { value: 'other', label: 'Other / Custom Certificate' },
];

export const CERTIFICATE_FIELDS = [
  { key: 'salutation', label: 'Salutation' },
  { key: 'patientName', label: 'Patient name' },
  { key: 'certificateDate', label: 'Certificate date' },
  { key: 'startDate', label: 'Start date' },
  { key: 'endDate', label: 'End date' },
  { key: 'duration', label: 'Duration (days)', calculated: true },
  { key: 'medicalStatement', label: 'Medical statement' },
  { key: 'doctorName', label: 'Doctor name' },
  { key: 'clinicAddress', label: 'Clinic address' },
  { key: 'clinicEmail', label: 'Clinic email' },
];

export const FIELD_DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'longText', label: 'Long text' },
  { value: 'integer', label: 'Number' },
  { value: 'decimal', label: 'Decimal number' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Price / currency' },
];

export const SPACE_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export const PREDEFINED_FIELD_TYPES = {
  salutation: 'text',
  patientName: 'text',
  certificateDate: 'date',
  startDate: 'date',
  endDate: 'date',
  duration: 'integer',
  medicalStatement: 'longText',
  doctorName: 'text',
  clinicAddress: 'text',
  clinicEmail: 'text',
};

const FIELD_KEYS = new Set(CERTIFICATE_FIELDS.map((field) => field.key));
const FIELD_DATA_TYPE_SET = new Set(FIELD_DATA_TYPES.map((entry) => entry.value));
const SPACE_SIZE_SET = new Set(SPACE_SIZES.map((entry) => entry.value));
const BLOCK_TYPES = new Set(['heading', 'text', 'field', 'space']);

export function resolveFieldDataType(block) {
  if (PREDEFINED_FIELD_TYPES[block?.fieldKey]) return PREDEFINED_FIELD_TYPES[block.fieldKey];
  if (FIELD_DATA_TYPE_SET.has(block?.dataType)) return block.dataType;
  return 'text';
}

export function normalizeFieldLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function createFieldKey(label, usedKeys = []) {
  const used = new Set(usedKeys);
  let base = normalizeFieldLabel(label).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
  if (!/^[a-z]/.test(base)) base = `field_${base || 'value'}`.replace(/_+/g, '_');

  let key = base;
  let suffix = 2;
  while (used.has(key) || FIELD_KEYS.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }

  return key;
}

export function collectFieldCatalog(templates = []) {
  const catalog = new Map(
    CERTIFICATE_FIELDS.map((field) => [field.key, {
      key: field.key,
      label: field.label,
      calculated: Boolean(field.calculated),
      dataType: PREDEFINED_FIELD_TYPES[field.key],
      custom: false,
    }])
  );

  templates.forEach((template) => {
    (template?.blocks ?? []).forEach((block) => {
      if (block?.type !== 'field' || !block.fieldKey || catalog.has(block.fieldKey)) return;
      if (FIELD_KEYS.has(block.fieldKey)) return;

      catalog.set(block.fieldKey, {
        key: block.fieldKey,
        label: String(block.label || block.fieldKey),
        calculated: false,
        dataType: resolveFieldDataType(block),
        required: Boolean(block.required),
        custom: true,
      });
    });
  });

  return [...catalog.values()];
}

function fieldMatchScore(field, query) {
  const label = normalizeFieldLabel(field.label);
  const key = String(field.key ?? '').toLowerCase();
  if (label === query || key === query) return 100;
  if (label.startsWith(query) || key.startsWith(query)) return 80;
  if (label.includes(query) || key.includes(query)) return 50;

  const words = query.split(' ').filter(Boolean);
  if (words.length > 1 && words.every((word) => label.includes(word))) return 40;
  return 0;
}

export function searchCertificateFields(catalog, query) {
  const normalized = normalizeFieldLabel(query);
  if (!normalized) return catalog;

  return catalog
    .map((field) => ({ field, score: fieldMatchScore(field, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.field.label.localeCompare(right.field.label))
    .map((entry) => entry.field);
}

export function findEquivalentField(catalog, label) {
  const normalized = normalizeFieldLabel(label);
  if (!normalized) return null;

  return catalog.find((field) => normalizeFieldLabel(field.label) === normalized) ?? null;
}

export function getCategoryLabel(category) {
  return TEMPLATE_CATEGORIES.find((entry) => entry.value === category)?.label ?? 'Certificate';
}

export function getCertificateField(fieldKey) {
  return CERTIFICATE_FIELDS.find((field) => field.key === fieldKey) ?? null;
}

export function createBlock(type = 'text') {
  const id = `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  if (type === 'heading') {
    return { id, type: 'heading', text: '' };
  }

  if (type === 'field') {
    return {
      id,
      type: 'field',
      fieldKey: 'medicalStatement',
      label: 'Medical statement',
      calculated: false,
      custom: false,
    };
  }

  if (type === 'space') {
    return { id, type: 'space', size: 'small' };
  }

  return { id, type: 'text', text: '' };
}

export function normalizeBlock(raw, index = 0) {
  const type = BLOCK_TYPES.has(raw?.type) ? raw.type : 'text';
  const id = String(raw?.id || `block-${index + 1}`);

  if (type === 'space') {
    return {
      id,
      type: 'space',
      size: SPACE_SIZE_SET.has(raw?.size) ? raw.size : 'small',
    };
  }

  if (type === 'field') {
    const predefined = getCertificateField(raw?.fieldKey);

    if (predefined) {
      return {
        id,
        type: 'field',
        fieldKey: predefined.key,
        label: String(raw?.label ?? predefined.label).trim() || predefined.label,
        calculated: Boolean(predefined.calculated),
        custom: false,
      };
    }

    return {
      id,
      type: 'field',
      fieldKey: String(raw?.fieldKey ?? '').trim(),
      label: String(raw?.label ?? '').trim(),
      calculated: false,
      dataType: resolveFieldDataType(raw),
      required: Boolean(raw?.required),
      custom: true,
    };
  }

  return {
    id,
    type,
    text: String(raw?.text ?? ''),
  };
}

export function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block, index) => normalizeBlock(block, index));
}

export function serializeBlock(block) {
  const normalized = normalizeBlock(block);

  if (normalized.type === 'space') {
    return {
      id: normalized.id,
      type: 'space',
      size: normalized.size,
    };
  }

  if (normalized.type === 'field') {
    if (!normalized.custom) {
      return {
        id: normalized.id,
        type: 'field',
        fieldKey: normalized.fieldKey,
        label: normalized.label,
        calculated: normalized.calculated,
      };
    }

    return {
      id: normalized.id,
      type: 'field',
      fieldKey: normalized.fieldKey,
      label: normalized.label,
      calculated: false,
      dataType: normalized.dataType,
      required: Boolean(normalized.required),
      custom: true,
    };
  }

  return {
    id: normalized.id,
    type: normalized.type,
    text: normalized.text.trim(),
  };
}

export function validateTemplateInput(input) {
  const errors = {};
  const name = String(input?.name ?? '').trim();
  const category = String(input?.category ?? '');
  const blocks = normalizeBlocks(input?.blocks).map(serializeBlock);

  if (!name) {
    errors.name = 'Template name is required.';
  }

  if (!TEMPLATE_CATEGORIES.some((entry) => entry.value === category)) {
    errors.category = 'Choose a category.';
  }

  if (blocks.length === 0) {
    errors.blocks = 'Add at least one section.';
  }

  const usedFields = new Set();

  blocks.forEach((block, index) => {
    if (block.type === 'space') return;

    if (block.type !== 'field' && !block.text) {
      errors[`block-${index}`] = block.type === 'heading'
        ? 'Enter the heading.'
        : 'Enter the text.';
    }

    if (block.type === 'field') {
      const keyIsValid = FIELD_KEYS.has(block.fieldKey) || /^[a-z][a-z0-9_]{0,40}$/.test(block.fieldKey);

      if (!keyIsValid) {
        errors[`block-${index}`] = 'Enter a field key that starts with a letter and uses only letters, numbers, and underscores.';
      } else if (usedFields.has(block.fieldKey)) {
        errors[`block-${index}`] = 'Each field can only be used once in a template.';
      } else if (!block.label) {
        errors[`block-${index}`] = 'Enter a field label.';
      } else if (block.custom && !FIELD_DATA_TYPE_SET.has(block.dataType)) {
        errors[`block-${index}`] = 'Choose a data type.';
      }

      usedFields.add(block.fieldKey);
    }
  });

  if (usedFields.has('duration') && (!usedFields.has('startDate') || !usedFields.has('endDate'))) {
    errors.duration = 'Add start and end date fields so duration can be calculated.';
  }

  return {
    errors,
    value: { name, category, blocks },
  };
}

export function snapshotTemplate(template) {
  return {
    name: String(template?.name ?? ''),
    category: String(template?.category ?? 'other'),
    version: Number(template?.version) || 1,
    blocks: normalizeBlocks(template?.blocks).map(serializeBlock),
  };
}

export function readStoredSnapshot(raw) {
  const blocks = Array.isArray(raw?.blocks)
    ? raw.blocks.map((block, index) => {
        const type = BLOCK_TYPES.has(block?.type) ? block.type : 'text';
        const id = String(block?.id || `block-${index + 1}`);

        if (type === 'space') {
          return {
            id,
            type: 'space',
            size: SPACE_SIZE_SET.has(block?.size) ? block.size : 'small',
          };
        }

        if (type === 'field') {
          const predefined = getCertificateField(block?.fieldKey);
          const field = {
            id,
            type: 'field',
            fieldKey: String(block?.fieldKey ?? ''),
            label: String(block?.label ?? ''),
            calculated: Boolean(block?.calculated || predefined?.calculated),
          };

          if (!predefined) {
            field.dataType = resolveFieldDataType(block);
            field.required = Boolean(block?.required);
            field.custom = true;
          }

          return field;
        }

        return {
          id,
          type,
          text: String(block?.text ?? ''),
        };
      })
    : [];

  return {
    name: String(raw?.name ?? ''),
    category: String(raw?.category ?? 'other'),
    version: Number(raw?.version) || 1,
    blocks,
  };
}

export function describeBlock(block) {
  if (block.type === 'heading') return block.text;
  if (block.type === 'text') return block.text;
  if (block.type === 'space') {
    const size = SPACE_SIZES.find((entry) => entry.value === block.size)?.label ?? 'Small';
    return `Keep Some Space — ${size}`;
  }

  const field = getCertificateField(block.fieldKey);
  const calculated = field?.calculated ? ' Calculated from the start and end dates.' : '';
  return `${block.label} (${field?.label ?? block.fieldKey}).${calculated}`;
}
