import React, { useState } from 'react';
import { FIELD_DEFINITIONS, getFieldIcon, FieldDefinition } from './fieldRegistry';
import { FormFieldType } from '../../types';
import { Search, Plus, Sparkles } from 'lucide-react';

interface FieldPaletteProps {
  onAddField: (type: FormFieldType) => void;
}

export const FieldPalette: React.FC<FieldPaletteProps> = ({ onAddField }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'text', label: 'Text' },
    { id: 'choice', label: 'Choice' },
    { id: 'datetime', label: 'Date/Time' },
    { id: 'media', label: 'Media' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'layout', label: 'Layout' },
  ];

  const filteredFields = FIELD_DEFINITIONS.filter((f) => {
    const matchesSearch =
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-72 lg:w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Field Library
          </span>
          <span className="text-[11px] text-slate-400 font-medium">20 Field Types</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Field Items List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
        {filteredFields.map((field) => {
          const Icon = getFieldIcon(field.type);
          return (
            <button
              key={field.type}
              onClick={() => onAddField(field.type)}
              className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900 truncate">
                    {field.label}
                  </h4>
                  <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                  {field.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
