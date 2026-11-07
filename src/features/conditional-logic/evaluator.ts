import { FormField, ConditionalRule, ConditionalRuleGroup, FormSection, FormThemeConfig } from '../../types';

/**
 * Checks a single conditional rule against current form answers
 */
export function checkSingleRule(
  rule: ConditionalRule,
  formValues: Record<string, any>
): boolean {
  const answer = formValues[rule.sourceFieldKey];
  const targetVal = rule.value;

  switch (rule.operator) {
    case 'equals':
      if (typeof answer === 'boolean') {
        return Boolean(targetVal) === answer;
      }
      if (answer === undefined || answer === null) {
        return targetVal === '' || targetVal === null || targetVal === undefined;
      }
      return String(answer).trim().toLowerCase() === String(targetVal).trim().toLowerCase();

    case 'not_equals':
      if (typeof answer === 'boolean') {
        return Boolean(targetVal) !== answer;
      }
      if (answer === undefined || answer === null) {
        return targetVal !== '' && targetVal !== null && targetVal !== undefined;
      }
      return String(answer).trim().toLowerCase() !== String(targetVal).trim().toLowerCase();

    case 'contains':
      if (!answer) return false;
      if (Array.isArray(answer)) {
        return answer.some((item) =>
          String(item).toLowerCase().includes(String(targetVal).toLowerCase())
        );
      }
      return String(answer).toLowerCase().includes(String(targetVal).toLowerCase());

    case 'is_empty':
      if (answer === undefined || answer === null || answer === '') return true;
      if (Array.isArray(answer) && answer.length === 0) return true;
      return false;

    case 'is_not_empty':
      if (answer === undefined || answer === null || answer === '') return false;
      if (Array.isArray(answer) && answer.length === 0) return false;
      return true;

    case 'greater_than':
      if (answer === undefined || answer === null || answer === '') return false;
      return Number(answer) > Number(targetVal);

    case 'less_than':
      if (answer === undefined || answer === null || answer === '') return false;
      return Number(answer) < Number(targetVal);

    default:
      return true;
  }
}

/**
 * Detects circular dependencies among fields
 */
export function hasCircularDependency(
  fieldKey: string,
  fieldsMap: Map<string, FormField>,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(fieldKey)) return true;
  visited.add(fieldKey);

  const field = fieldsMap.get(fieldKey);
  if (!field?.conditional_rules?.rules?.length) {
    visited.delete(fieldKey);
    return false;
  }

  for (const rule of field.conditional_rules.rules) {
    if (rule.sourceFieldKey === fieldKey) return true; // self-reference
    if (hasCircularDependency(rule.sourceFieldKey, fieldsMap, new Set(visited))) {
      return true;
    }
  }

  visited.delete(fieldKey);
  return false;
}

/**
 * Evaluates whether a field should be visible based on its conditional rules
 * and the visibility of its upstream dependencies.
 */
export function evaluateFieldVisibility(
  field: FormField,
  allFields: FormField[],
  formValues: Record<string, any>,
  evaluatedVisibilityCache: Map<string, boolean> = new Map()
): boolean {
  // If no conditional rules are configured, field is visible by default
  if (
    !field.conditional_rules ||
    !field.conditional_rules.rules ||
    field.conditional_rules.rules.length === 0
  ) {
    return true;
  }

  // Check cache for memoization & cycle avoidance
  if (evaluatedVisibilityCache.has(field.field_key)) {
    return evaluatedVisibilityCache.get(field.field_key)!;
  }

  // Mark in-progress to prevent infinite recursion
  evaluatedVisibilityCache.set(field.field_key, true);

  const fieldsMap = new Map(allFields.map((f) => [f.field_key, f]));
  const { logic, action, rules } = field.conditional_rules;

  // Verify that any parent dependency is visible itself
  for (const rule of rules) {
    const parentField = fieldsMap.get(rule.sourceFieldKey);
    if (parentField) {
      const isParentVisible = evaluateFieldVisibility(
        parentField,
        allFields,
        formValues,
        evaluatedVisibilityCache
      );
      if (!isParentVisible) {
        // Parent is hidden, so this dependent field must also be hidden
        evaluatedVisibilityCache.set(field.field_key, false);
        return false;
      }
    }
  }

  // Evaluate rule matches
  const ruleResults = rules.map((rule) => checkSingleRule(rule, formValues));

  const conditionMatches =
    logic === 'OR'
      ? ruleResults.some((res) => res === true)
      : ruleResults.every((res) => res === true);

  // If the action is purely section branching / skip navigation, field itself remains visible
  if (action === 'skip_to_section') {
    evaluatedVisibilityCache.set(field.field_key, true);
    return true;
  }

  const isVisible = action === 'show' ? conditionMatches : !conditionMatches;

  evaluatedVisibilityCache.set(field.field_key, isVisible);
  return isVisible;
}

/**
 * Filter form values before submission:
 * Safely removes values for fields that are currently hidden
 */
export function sanitizeSubmissionData(
  fields: FormField[],
  formValues: Record<string, any>
): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const cache = new Map<string, boolean>();

  for (const field of fields) {
    const isVisible = evaluateFieldVisibility(field, fields, formValues, cache);
    if (isVisible && formValues[field.field_key] !== undefined) {
      sanitized[field.field_key] = formValues[field.field_key];
    }
  }

  return sanitized;
}

/**
 * Validates active visible fields against required rules and custom constraints
 */
export function validateFormSubmission(
  fields: FormField[],
  formValues: Record<string, any>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const cache = new Map<string, boolean>();

  for (const field of fields) {
    const isVisible = evaluateFieldVisibility(field, fields, formValues, cache);
    if (!isVisible) continue; // Hidden fields are NOT required!

    const val = formValues[field.field_key];

    // Required check
    if (field.required) {
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0) ||
        (field.field_type === 'consent_checkbox' && val !== true)
      ) {
        errors[field.field_key] = `${field.label} is required.`;
        continue;
      }
    }

    if (val === undefined || val === null || val === '') continue;

    // Type specific checks
    if (field.field_type === 'email' && typeof val === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        errors[field.field_key] = 'Please enter a valid email address.';
      }
    }

    if (field.field_type === 'website_url' && typeof val === 'string') {
      try {
        new URL(val.startsWith('http') ? val : `https://${val}`);
      } catch {
        errors[field.field_key] = 'Please enter a valid URL.';
      }
    }

    const rules = field.validation_rules;
    if (rules) {
      if (rules.minLength && typeof val === 'string' && val.length < rules.minLength) {
        errors[field.field_key] =
          rules.customErrorMessage || `Minimum ${rules.minLength} characters required.`;
      }
      if (rules.maxLength && typeof val === 'string' && val.length > rules.maxLength) {
        errors[field.field_key] =
          rules.customErrorMessage || `Maximum ${rules.maxLength} characters allowed.`;
      }
      if (rules.minValue !== undefined && Number(val) < rules.minValue) {
        errors[field.field_key] =
          rules.customErrorMessage || `Value must be at least ${rules.minValue}.`;
      }
      if (rules.maxValue !== undefined && Number(val) > rules.maxValue) {
        errors[field.field_key] =
          rules.customErrorMessage || `Value must be at most ${rules.maxValue}.`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Split form fields into sections based on 'section_heading' dividers
 */
export function getFormSections(fields: FormField[], themeConfig?: FormThemeConfig): FormSection[] {
  const sections: FormSection[] = [];
  let currentSection: FormSection | null = null;
  let sectionIndex = 1;

  for (const field of fields) {
    if (field.field_type === 'section_heading') {
      // Start a new section
      currentSection = {
        id: field.id,
        headingField: field,
        title: field.label || `Section ${sectionIndex}`,
        description: field.description,
        fields: [],
        next_section_id: field.next_section_id || themeConfig?.section_routes?.[field.id]?.next_section_id,
        conditional_rules: field.conditional_rules || themeConfig?.section_routes?.[field.id]?.conditional_rules,
      };
      sections.push(currentSection);
      sectionIndex++;
    } else {
      if (!currentSection) {
        // Leading fields before any section heading
        currentSection = {
          id: 'section-initial',
          title: 'General Information',
          description: undefined,
          fields: [],
          next_section_id: themeConfig?.section_routes?.['section-initial']?.next_section_id,
          conditional_rules: themeConfig?.section_routes?.['section-initial']?.conditional_rules,
        };
        sections.push(currentSection);
      }
      currentSection.fields.push(field);
    }
  }

  // If no sections were created (e.g. empty form), supply a fallback default section
  if (sections.length === 0) {
    sections.push({
      id: 'section-default',
      title: 'Registration Form',
      fields: [],
    });
  }

  return sections;
}

/**
 * Check if a section is visible (if it has a headingField, evaluate its condition)
 */
export function evaluateSectionVisibility(
  section: FormSection,
  allFields: FormField[],
  formValues: Record<string, any>
): boolean {
  if (!section.headingField) return true;
  return evaluateFieldVisibility(section.headingField, allFields, formValues);
}

/**
 * Determine the next destination section index, evaluating conditional branching rules.
 * Returns section index (0 .. sections.length - 1) or -1 to signal immediate Form Submission.
 */
export function getNextSectionIndex(
  currentSectionIndex: number,
  sections: FormSection[],
  allFields: FormField[],
  formValues: Record<string, any>
): number {
  const currentSection = sections[currentSectionIndex];
  if (!currentSection) return -1;

  // 1. Option-level routing: Check if any answered choice question in this section has a destination_section_id
  for (const field of currentSection.fields) {
    const val = formValues[field.field_key];
    if (val !== undefined && val !== null && val !== '') {
      if (field.options && field.options.length > 0) {
        const selectedOption = field.options.find(
          (opt) => String(opt.value) === String(val) || opt.label === String(val)
        );
        if (selectedOption?.destination_section_id) {
          if (selectedOption.destination_section_id === 'submit') {
            return -1;
          }
          if (selectedOption.destination_section_id === 'next_section') {
            break;
          }
          const targetIndex = sections.findIndex((s) => s.id === selectedOption.destination_section_id);
          if (targetIndex !== -1) {
            return targetIndex;
          }
        }
      }
    }
  }

  // 2. Section-level or Field-level conditional queries (rules configured to jump to section or submit)
  const candidateRuleGroups: ConditionalRuleGroup[] = [
    ...(currentSection.conditional_rules ? [currentSection.conditional_rules] : []),
    ...(currentSection.headingField?.conditional_rules ? [currentSection.headingField.conditional_rules] : []),
    ...(currentSection.fields.map((f) => f.conditional_rules).filter(Boolean) as ConditionalRuleGroup[]),
  ];

  for (const rulesGroup of candidateRuleGroups) {
    if (!rulesGroup || !rulesGroup.rules || rulesGroup.rules.length === 0) continue;

    // Check individual rule level destination_section_id
    for (const rule of rulesGroup.rules) {
      if (rule.destination_section_id && checkSingleRule(rule, formValues)) {
        if (rule.destination_section_id === 'submit') return -1;
        const targetIndex = sections.findIndex((s) => s.id === rule.destination_section_id);
        if (targetIndex !== -1) return targetIndex;
      }
    }

    // Check group level skip_to_section action
    if (
      rulesGroup.action === 'skip_to_section' &&
      rulesGroup.destination_section_id
    ) {
      const ruleResults = rulesGroup.rules.map((rule) => checkSingleRule(rule, formValues));
      const conditionMatches =
        rulesGroup.logic === 'OR'
          ? ruleResults.some((res) => res === true)
          : ruleResults.every((res) => res === true);

      if (conditionMatches) {
        if (rulesGroup.destination_section_id === 'submit') return -1;
        const targetIndex = sections.findIndex(
          (s) => s.id === rulesGroup.destination_section_id
        );
        if (targetIndex !== -1) return targetIndex;
      }
    }
  }

  // 3. Check section default next_section_id
  const defaultNext =
    currentSection.next_section_id || currentSection.headingField?.next_section_id;
  if (defaultNext && defaultNext !== 'next_section') {
    if (defaultNext === 'submit') return -1;
    const targetIndex = sections.findIndex((s) => s.id === defaultNext);
    if (targetIndex !== -1) return targetIndex;
  }

  // 4. Default: advance to the next sequentially visible section
  for (let idx = currentSectionIndex + 1; idx < sections.length; idx++) {
    if (evaluateSectionVisibility(sections[idx], allFields, formValues)) {
      return idx;
    }
  }

  // If no subsequent visible section exists, return -1 (Submit)
  return -1;
}

/**
 * Validate only fields in the current section
 */
export function validateSectionFields(
  sectionFields: FormField[],
  formValues: Record<string, any>,
  allFields: FormField[]
): { isValid: boolean; errors: Record<string, string> } {
  return validateFormSubmission(sectionFields, formValues);
}

/**
 * Validates only the fields in traversed sections (plus global fields)
 * so skipped sections don't block form submission.
 */
export function validateTraversedSections(
  sections: FormSection[],
  traversedSectionIndices: Set<number>,
  formValues: Record<string, any>,
  allFields: FormField[]
): { isValid: boolean; errors: Record<string, string> } {
  const fieldsToValidate: FormField[] = [];

  sections.forEach((sec, idx) => {
    if (traversedSectionIndices.has(idx)) {
      if (sec.headingField) fieldsToValidate.push(sec.headingField);
      fieldsToValidate.push(...sec.fields);
    }
  });

  return validateFormSubmission(fieldsToValidate, formValues);
}

