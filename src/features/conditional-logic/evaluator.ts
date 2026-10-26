import { FormField, ConditionalRule, ConditionalRuleGroup } from '../../types';

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
