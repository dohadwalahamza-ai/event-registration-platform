import React from 'react';
import { FormField, ConditionalRule, ConditionalRuleGroup, ConditionalOperator } from '../../types';
import { Plus, Trash2, GitFork, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../../generic-ui/components/Button';

interface ConditionalRuleEditorProps {
  currentField: FormField;
  allFields: FormField[];
  onChange: (updatedGroup?: ConditionalRuleGroup) => void;
}

export const ConditionalRuleEditor: React.FC<ConditionalRuleEditorProps> = ({
  currentField,
  allFields,
  onChange,
}) => {
  // Only fields that appear BEFORE this field (or are distinct) can be used as sources to prevent circular dependency
  const availableSourceFields = allFields.filter(
    (f) =>
      f.field_key !== currentField.field_key &&
      !['section_heading', 'info_text'].includes(f.field_type)
  );

  const ruleGroup = currentField.conditional_rules || {
    action: 'show',
    logic: 'AND',
    rules: [],
  };

  const handleActionChange = (action: 'show' | 'hide') => {
    onChange({
      ...ruleGroup,
      action,
    });
  };

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onChange({
      ...ruleGroup,
      logic,
    });
  };

  const handleAddRule = () => {
    const firstAvailable = availableSourceFields[0];
    if (!firstAvailable) return;

    const newRule: ConditionalRule = {
      id: Math.random().toString(36).substring(2, 9),
      sourceFieldKey: firstAvailable.field_key,
      operator: 'equals',
      value: firstAvailable.options?.[0]?.value || '',
    };

    onChange({
      ...ruleGroup,
      rules: [...ruleGroup.rules, newRule],
    });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    const updatedRules = ruleGroup.rules.map((r) => {
      if (r.id !== ruleId) return r;
      const merged = { ...r, ...updates };

      // If source field changed, adjust default value if it has options
      if (updates.sourceFieldKey && updates.sourceFieldKey !== r.sourceFieldKey) {
        const newSource = availableSourceFields.find((f) => f.field_key === updates.sourceFieldKey);
        if (newSource?.options?.length) {
          merged.value = newSource.options[0].value;
        } else if (newSource?.field_type === 'yes_no') {
          merged.value = true;
        } else {
          merged.value = '';
        }
      }
      return merged;
    });

    onChange({
      ...ruleGroup,
      rules: updatedRules,
    });
  };

  const handleRemoveRule = (ruleId: string) => {
    const updatedRules = ruleGroup.rules.filter((r) => r.id !== ruleId);
    if (updatedRules.length === 0) {
      onChange(undefined);
    } else {
      onChange({
        ...ruleGroup,
        rules: updatedRules,
      });
    }
  };

  const handleClearAll = () => {
    onChange(undefined);
  };

  if (availableSourceFields.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <p>
          Add more questions to your form first to create conditional logic branches. (e.g., cricket category, yes/no participation, jersey selection).
        </p>
      </div>
    );
  }

  const hasRules = ruleGroup.rules.length > 0;

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Conditional Visibility
          </span>
        </div>
        {hasRules && (
          <button
            onClick={handleClearAll}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium"
          >
            Clear Logic
          </button>
        )}
      </div>

      {!hasRules ? (
        <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <GitFork className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No condition configured</p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
            This question is currently shown to everyone. Add a rule to show or hide it based on earlier responses.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddRule}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="mt-3.5"
          >
            Add Condition Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Main Statement Config */}
          <div className="flex flex-wrap items-center gap-2 text-xs bg-indigo-50/70 p-3 rounded-xl border border-indigo-100/80">
            <span className="font-semibold text-indigo-900">Rule:</span>
            <select
              value={ruleGroup.action}
              onChange={(e) => handleActionChange(e.target.value as 'show' | 'hide')}
              className="bg-white border border-indigo-200 text-indigo-900 font-bold px-2 py-1 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="show">SHOW</option>
              <option value="hide">HIDE</option>
            </select>
            <span className="text-indigo-800">this field when</span>
            {ruleGroup.rules.length > 1 && (
              <>
                <select
                  value={ruleGroup.logic}
                  onChange={(e) => handleLogicChange(e.target.value as 'AND' | 'OR')}
                  className="bg-white border border-indigo-200 text-indigo-900 font-bold px-2 py-1 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="AND">ALL (AND)</option>
                  <option value="OR">ANY (OR)</option>
                </select>
                <span className="text-indigo-800">of the following match:</span>
              </>
            )}
          </div>

          {/* List of rules */}
          <div className="space-y-2.5">
            {ruleGroup.rules.map((rule, idx) => {
              const sourceField = availableSourceFields.find((f) => f.field_key === rule.sourceFieldKey);
              return (
                <div
                  key={rule.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5 relative group hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Condition #{idx + 1}</span>
                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove condition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {/* Source Field Selector */}
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        When Question
                      </label>
                      <select
                        value={rule.sourceFieldKey}
                        onChange={(e) => handleUpdateRule(rule.id, { sourceFieldKey: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-medium focus:bg-white"
                      >
                        {availableSourceFields.map((f) => (
                          <option key={f.id} value={f.field_key}>
                            {f.label || `Field: ${f.field_key}`} ({f.field_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Operator */}
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        Condition
                      </label>
                      <select
                        value={rule.operator}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, {
                            operator: e.target.value as ConditionalOperator,
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-medium focus:bg-white"
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">does not equal</option>
                        <option value="contains">contains</option>
                        <option value="is_empty">is empty</option>
                        <option value="is_not_empty">is not empty</option>
                        <option value="greater_than">greater than</option>
                        <option value="less_than">less than</option>
                      </select>
                    </div>

                    {/* Expected Value */}
                    {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                          Value
                        </label>
                        {sourceField?.options && sourceField.options.length > 0 ? (
                          <select
                            value={String(rule.value)}
                            onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-medium focus:bg-white"
                          >
                            {sourceField.options.map((opt) => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : sourceField?.field_type === 'yes_no' ? (
                          <select
                            value={String(rule.value)}
                            onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value === 'true' })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-medium focus:bg-white"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            type={sourceField?.field_type === 'number' ? 'number' : 'text'}
                            value={String(rule.value || '')}
                            placeholder="Enter matching answer..."
                            onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:bg-white"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={handleAddRule}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Rule
            </button>
            <span className="text-[11px] text-slate-400">
              Evaluated in real-time on public form
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
