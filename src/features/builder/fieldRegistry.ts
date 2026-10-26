import React from 'react';
import { FormFieldType } from '../../types';
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  Calendar,
  Clock,
  CalendarClock,
  UploadCloud,
  Camera,
  ToggleLeft,
  Heading,
  Info,
  MapPin,
  Globe,
  Star,
  ShieldCheck,
} from 'lucide-react';

export interface FieldDefinition {
  type: FormFieldType;
  label: string;
  category: 'text' | 'choice' | 'datetime' | 'media' | 'advanced' | 'layout';
  description: string;
  iconName: string;
  defaultLabel: string;
  defaultPlaceholder?: string;
  defaultDescription?: string;
  hasOptions?: boolean;
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Text & Input
  {
    type: 'short_text',
    label: 'Short Text',
    category: 'text',
    description: 'Single-line text for names, titles, or brief answers',
    iconName: 'Type',
    defaultLabel: 'Full Name',
    defaultPlaceholder: 'Enter your answer...',
  },
  {
    type: 'long_text',
    label: 'Paragraph / Long Text',
    category: 'text',
    description: 'Multi-line text for feedback, proposals, or bios',
    iconName: 'AlignLeft',
    defaultLabel: 'Detailed Description',
    defaultPlaceholder: 'Write your thoughts here...',
  },
  {
    type: 'email',
    label: 'Email Address',
    category: 'text',
    description: 'Email with format validation for communication',
    iconName: 'Mail',
    defaultLabel: 'Email Address',
    defaultPlaceholder: 'name@example.com',
  },
  {
    type: 'phone',
    label: 'Phone Number',
    category: 'text',
    description: 'Mobile number with country code support',
    iconName: 'Phone',
    defaultLabel: 'Phone Number',
    defaultPlaceholder: '+91 98765 43210',
  },
  {
    type: 'number',
    label: 'Number',
    category: 'text',
    description: 'Numeric inputs with min/max validation rules',
    iconName: 'Hash',
    defaultLabel: 'Age / Quantity',
    defaultPlaceholder: 'e.g. 24',
  },
  {
    type: 'website_url',
    label: 'Website URL',
    category: 'text',
    description: 'Valid URL for portfolios, links, or GitHub',
    iconName: 'Globe',
    defaultLabel: 'Website / Portfolio URL',
    defaultPlaceholder: 'https://example.com',
  },
  {
    type: 'address',
    label: 'Address',
    category: 'text',
    description: 'Physical address with street, city, and postal code',
    iconName: 'MapPin',
    defaultLabel: 'Mailing Address',
    defaultPlaceholder: 'Street, Sector, City, State, PIN',
  },

  // Choice
  {
    type: 'radio',
    label: 'Single Choice (Radio)',
    category: 'choice',
    description: 'Pick exactly one option from a list',
    iconName: 'CheckCircle',
    defaultLabel: 'Select an Option',
    hasOptions: true,
  },
  {
    type: 'checkbox',
    label: 'Multiple Choice (Checkboxes)',
    category: 'choice',
    description: 'Select one or more options',
    iconName: 'CheckSquare',
    defaultLabel: 'Select all that apply',
    hasOptions: true,
  },
  {
    type: 'dropdown',
    label: 'Dropdown Menu',
    category: 'choice',
    description: 'Select one option from a compact dropdown menu',
    iconName: 'ChevronDown',
    defaultLabel: 'Choose from dropdown',
    hasOptions: true,
  },
  {
    type: 'yes_no',
    label: 'Yes / No Toggle',
    category: 'choice',
    description: 'Binary decision question (great for conditional triggers)',
    iconName: 'ToggleLeft',
    defaultLabel: 'Will you be attending in person?',
  },

  // Date & Time
  {
    type: 'date',
    label: 'Date Picker',
    category: 'datetime',
    description: 'Calendar date picker',
    iconName: 'Calendar',
    defaultLabel: 'Preferred Date',
  },
  {
    type: 'time',
    label: 'Time Picker',
    category: 'datetime',
    description: 'Time selector for arrival or slots',
    iconName: 'Clock',
    defaultLabel: 'Preferred Time',
  },
  {
    type: 'datetime',
    label: 'Date & Time',
    category: 'datetime',
    description: 'Combined date and time timestamp',
    iconName: 'CalendarClock',
    defaultLabel: 'Date & Time Slot',
  },

  // Media & Files
  {
    type: 'photo_upload',
    label: 'Photo Upload',
    category: 'media',
    description: 'Direct image upload with instant thumbnail preview',
    iconName: 'Camera',
    defaultLabel: 'Upload ID / Passport Photo',
    defaultDescription: 'JPG, PNG, or WebP up to 5MB',
  },
  {
    type: 'file_upload',
    label: 'File Upload',
    category: 'media',
    description: 'General document upload (PDF, DOCX, ZIP)',
    iconName: 'UploadCloud',
    defaultLabel: 'Upload Document / Resume',
    defaultDescription: 'Upload supporting proof or certificate',
  },

  // Advanced & Interactive
  {
    type: 'rating',
    label: 'Star Rating',
    category: 'advanced',
    description: 'Interactive 1-5 star rating selector',
    iconName: 'Star',
    defaultLabel: 'Rate your prior experience (1 to 5 stars)',
  },
  {
    type: 'consent_checkbox',
    label: 'Consent & Disclaimer',
    category: 'advanced',
    description: 'Mandatory agreement checkbox with terms',
    iconName: 'ShieldCheck',
    defaultLabel: 'I accept the event terms, safety waiver, and tournament code of conduct.',
  },

  // Layout & Formatting
  {
    type: 'section_heading',
    label: 'Section Heading',
    category: 'layout',
    description: 'Visual divider to organize questions into chapters',
    iconName: 'Heading',
    defaultLabel: 'New Section',
    defaultDescription: 'Section subtitle or instructions for participants',
  },
  {
    type: 'info_text',
    label: 'Informational Text',
    category: 'layout',
    description: 'Callout note or guidelines without asking for input',
    iconName: 'Info',
    defaultLabel: 'Important Notice',
    defaultDescription: 'Please read the guidelines before proceeding.',
  },
];

export function getFieldIcon(type: FormFieldType) {
  switch (type) {
    case 'short_text':
      return Type;
    case 'long_text':
      return AlignLeft;
    case 'email':
      return Mail;
    case 'phone':
      return Phone;
    case 'number':
      return Hash;
    case 'website_url':
      return Globe;
    case 'address':
      return MapPin;
    case 'radio':
      return CheckCircle;
    case 'checkbox':
      return CheckSquare;
    case 'dropdown':
      return ChevronDown;
    case 'yes_no':
      return ToggleLeft;
    case 'date':
      return Calendar;
    case 'time':
      return Clock;
    case 'datetime':
      return CalendarClock;
    case 'photo_upload':
      return Camera;
    case 'file_upload':
      return UploadCloud;
    case 'rating':
      return Star;
    case 'consent_checkbox':
      return ShieldCheck;
    case 'section_heading':
      return Heading;
    case 'info_text':
      return Info;
    default:
      return Type;
  }
}
