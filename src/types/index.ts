export type FormFieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file_upload'
  | 'photo_upload'
  | 'yes_no'
  | 'section_heading'
  | 'info_text'
  | 'address'
  | 'website_url'
  | 'rating'
  | 'consent_checkbox';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than';

export interface ConditionalRule {
  id: string;
  sourceFieldKey: string;
  operator: ConditionalOperator;
  value: string | number | boolean;
}

export interface ConditionalRuleGroup {
  logic: 'AND' | 'OR';
  action: 'show' | 'hide';
  rules: ConditionalRule[];
}

export interface FieldValidationRules {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  pattern?: string;
  customErrorMessage?: string;
}

export interface FormField {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: FormFieldType;
  description?: string;
  placeholder?: string;
  required: boolean;
  default_value?: any;
  options?: FieldOption[];
  validation_rules?: FieldValidationRules;
  conditional_rules?: ConditionalRuleGroup;
  sort_order: number;
  configuration?: Record<string, any>;
}

export type FormBackgroundStyle =
  | 'banner_glass'
  | 'solid_color'
  | 'midnight_dark'
  | 'vibrant_gradient'
  | 'sunset_warm'
  | 'emerald_turf'
  | 'ocean_blue'
  | 'soft_minimal'
  | 'accent_glow';

export interface FormThemeConfig {
  accentColor: string;
  headerStyle: 'banner' | 'card' | 'minimal';
  themeMode: 'light' | 'clean' | 'dark';
  backgroundStyle?: FormBackgroundStyle;
  customBackgroundColor?: string;
  fontFamily?: string;
  borderRadius: 'sm' | 'md' | 'lg' | 'xl';
}

export interface Form {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string;
  cover_image_url?: string;
  event_date?: string;
  event_end_date?: string;
  venue?: string;
  status: 'draft' | 'published' | 'closed';
  registration_deadline?: string;
  theme_config: FormThemeConfig;
  success_message: string;
  redirect_url?: string;
  published_version: number;
  created_at: string;
  updated_at: string;
  response_limit?: 'single' | 'multiple';
  fields?: FormField[];
}

export interface Submission {
  id: string;
  form_id: string;
  form_version: number;
  submission_data: Record<string, any>;
  submitted_at: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  applicant_name?: string;
  applicant_email?: string;
  admin_notes?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'organizer';
  created_at: string;
}

export interface DashboardStats {
  totalForms: number;
  publishedForms: number;
  totalRegistrations: number;
  recentSubmissions: number;
}
