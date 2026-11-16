import { Form, FormField } from '../types';

export const SAMPLE_FORMS: Form[] = [
  {
    id: 'form-mvqecm9w',
    owner_id: 'admin',
    title: 'Owner Registration Form',
    slug: 'event-form-mvqecm9w',
    description: `# 🏆 KCL Season 4 – Team Ownership Registration

Welcome to the **Kharghar Champions League (KCL) Season 4!**

We are inviting interested individuals and cricket enthusiasts to register their interest in becoming a **Team Owner** for the upcoming season.

KCL is more than just a cricket tournament — it’s a celebration of sportsmanship, teamwork, competition, and community spirit. As a team owner, you will have the opportunity to build and manage your team, participate in the league, and be part of an exciting cricketing experience.

**📋 Registration Details:**
- Fill in all the required details accurately.
- Submit your ownership registration for consideration.
- Further details regarding team ownership, auction procedures, fees, rules, and responsibilities will be shared by the organizing committee.

**🏆 Be a part of the action. Build your team. Make history!**

Register now and take your first step towards becoming a proud owner of a KCL Season 4 team!

*Note: Submission of this form does not guarantee team ownership. Final confirmation will be subject to the approval of the KCL organizing committee.* and Umoor Sehat`,
    cover_image_url:
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80',
    venue: 'NA',
    event_date: '2026-01-28T10:00',
    status: 'published',
    response_limit: 'single',
    theme_config: {
      accentColor: '#059669',
      headerStyle: 'banner',
      themeMode: 'light',
      backgroundStyle: 'emerald_turf',
      borderRadius: 'xl',
      customBackgroundColor: '#0f172a',
    },
    success_message: 'Thank you for registering! We have recorded your submission.',
    published_version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    fields: [
      {
        id: 'f-049s81',
        form_id: 'form-mvqecm9w',
        field_key: 'full_name',
        label: 'Full Name',
        field_type: 'short_text',
        placeholder: 'Enter your full name',
        required: true,
        sort_order: 1,
      },
      {
        id: 'f-yq73fh',
        form_id: 'form-mvqecm9w',
        field_key: 'phone_number',
        label: 'Phone / WhatsApp Number',
        field_type: 'phone',
        placeholder: '+91 98765 43210',
        required: true,
        sort_order: 2,
      },
      {
        id: 'f-mvqej75h-kilp',
        form_id: 'form-mvqecm9w',
        field_key: 'consent_checkbox_2dm6',
        label:
          'Note: Submission of this form does not guarantee team ownership. Final confirmation will be subject to the approval of the KCL organizing committee.* and Umoor Sehat',
        field_type: 'consent_checkbox',
        required: true,
        sort_order: 3,
      },
    ],
  },
];

export const INITIAL_SUBMISSIONS: any[] = [];

