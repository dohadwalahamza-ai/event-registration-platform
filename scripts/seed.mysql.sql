-- =======================================================
-- EVENT FORM BUILDER – DATA MIGRATION SEED SCRIPT
-- =======================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Seed Default Administrator
INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`, `created_at`, `updated_at`) VALUES (
  'admin-primary',
  'admin@admin.com',
  '$2b$12$eX03m5sO1r2N5E5tJj3Vn.aC3b1m4b8g5J8o0K4n3H9g7L1f8w9y2',
  'Administrator',
  'admin',
  NOW(3),
  NOW(3)
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Seed Forms
INSERT INTO `forms` (
  `id`, `owner_id`, `title`, `slug`, `description`, `cover_image_url`,
  `event_date`, `venue`, `status`, `theme_config`, `presentation_mode`,
  `success_message`, `published_version`, `created_at`, `updated_at`
) VALUES (
  'form-mvqecm9w',
  'admin',
  'Owner Registration Form',
  'event-form-mvqecm9w',
  '# 🏆 KCL Season 4 – Team Ownership Registration

Welcome to the **Kharghar Champions League (KCL) Season 4!**

We are inviting interested individuals and cricket enthusiasts to register their interest in becoming a **Team Owner** for the upcoming season.

KCL is more than just a cricket tournament — it’s a celebration of sportsmanship, teamwork, competition, and community spirit. As a team owner, you will have the opportunity to build and manage your team, participate in the league, and be part of an exciting cricketing experience.

**📋 Registration Details:**
- Fill in all the required details accurately.
- Submit your ownership registration for consideration.
- Further details regarding team ownership, auction procedures, fees, rules, and responsibilities will be shared by the organizing committee.

**🏆 Be a part of the action. Build your team. Make history!**

Register now and take your first step towards becoming a proud owner of a KCL Season 4 team!

*Note: Submission of this form does not guarantee team ownership. Final confirmation will be subject to the approval of the KCL organizing committee.* and Umoor Sehat',
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80',
  '2026-01-28 10:00:00',
  'NA',
  'published',
  '{"accentColor":"#059669","headerStyle":"banner","themeMode":"light","backgroundStyle":"emerald_turf","borderRadius":"xl","customBackgroundColor":"#0f172a"}',
  'step_by_step',
  'Thank you for registering! We have recorded your submission.',
  1,
  NOW(3),
  NOW(3)
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `updated_at` = NOW(3);

-- 3. Fields for form: form-mvqecm9w (Owner Registration Form)
INSERT INTO `form_fields` (
  `id`, `form_id`, `field_key`, `label`, `field_type`, `placeholder`, `required`,
  `options`, `validation_rules`, `conditional_rules`, `sort_order`, `configuration`, `created_at`
) VALUES (
  'f-049s81',
  'form-mvqecm9w',
  'full_name',
  'Full Name',
  'short_text',
  'Enter your full name',
  1,
  NULL,
  NULL,
  NULL,
  1,
  NULL,
  NOW(3)
) ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `required` = VALUES(`required`);

INSERT INTO `form_fields` (
  `id`, `form_id`, `field_key`, `label`, `field_type`, `placeholder`, `required`,
  `options`, `validation_rules`, `conditional_rules`, `sort_order`, `configuration`, `created_at`
) VALUES (
  'f-yq73fh',
  'form-mvqecm9w',
  'phone_number',
  'Phone / WhatsApp Number',
  'phone',
  '+91 98765 43210',
  1,
  NULL,
  NULL,
  NULL,
  2,
  NULL,
  NOW(3)
) ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `required` = VALUES(`required`);

INSERT INTO `form_fields` (
  `id`, `form_id`, `field_key`, `label`, `field_type`, `placeholder`, `required`,
  `options`, `validation_rules`, `conditional_rules`, `sort_order`, `configuration`, `created_at`
) VALUES (
  'f-mvqej75h-kilp',
  'form-mvqecm9w',
  'consent_checkbox_2dm6',
  'Note: Submission of this form does not guarantee team ownership. Final confirmation will be subject to the approval of the KCL organizing committee.* and Umoor Sehat',
  'consent_checkbox',
  NULL,
  1,
  NULL,
  NULL,
  NULL,
  3,
  NULL,
  NOW(3)
) ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `required` = VALUES(`required`);

SET FOREIGN_KEY_CHECKS = 1;
