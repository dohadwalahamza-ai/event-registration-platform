// scripts/schema.mysql.sql
-- =====================================================================
-- EVENT FORM BUILDER – PRODUCTION MYSQL 8.0+ SCHEMA
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci | Engine: InnoDB
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- 1. Users & Administrators Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(191) NOT NULL DEFAULT 'Administrator',
  `role` ENUM('admin', 'organizer') NOT NULL DEFAULT 'admin',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Forms Table
CREATE TABLE IF NOT EXISTS `forms` (
  `id` VARCHAR(64) NOT NULL,
  `owner_id` VARCHAR(64) NOT NULL DEFAULT 'admin',
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `description` LONGTEXT,
  `cover_image_url` TEXT,
  `event_date` DATETIME(3) NULL,
  `event_end_date` DATETIME(3) NULL,
  `venue` VARCHAR(255) NULL,
  `status` ENUM('draft', 'published', 'closed') NOT NULL DEFAULT 'draft',
  `registration_deadline` DATETIME(3) NULL,
  `theme_config` JSON NULL,
  `presentation_mode` ENUM('all_at_once', 'step_by_step') NOT NULL DEFAULT 'step_by_step',
  `success_message` TEXT,
  `redirect_url` TEXT,
  `published_version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_forms_slug` (`slug`),
  KEY `idx_forms_status` (`status`),
  KEY `idx_forms_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Form Fields Table
CREATE TABLE IF NOT EXISTS `form_fields` (
  `id` VARCHAR(64) NOT NULL,
  `form_id` VARCHAR(64) NOT NULL,
  `field_key` VARCHAR(64) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `field_type` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `placeholder` VARCHAR(255) NULL,
  `required` TINYINT(1) NOT NULL DEFAULT 0,
  `default_value` JSON NULL,
  `options` JSON NULL,
  `validation_rules` JSON NULL,
  `conditional_rules` JSON NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `configuration` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_fields_form_id` (`form_id`),
  KEY `idx_fields_form_sort` (`form_id`, `sort_order`),
  CONSTRAINT `fk_fields_form` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Submissions Table
CREATE TABLE IF NOT EXISTS `submissions` (
  `id` VARCHAR(64) NOT NULL,
  `form_id` VARCHAR(64) NOT NULL,
  `form_version` INT NOT NULL DEFAULT 1,
  `applicant_name` VARCHAR(191) NULL,
  `applicant_email` VARCHAR(191) NULL,
  `submission_data` JSON NOT NULL,
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` ENUM('confirmed', 'pending', 'cancelled') NOT NULL DEFAULT 'confirmed',
  `admin_notes` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_submissions_form_id` (`form_id`),
  KEY `idx_submissions_date` (`submitted_at`),
  KEY `idx_submissions_status` (`status`),
  CONSTRAINT `fk_submissions_form` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Media & File Uploads Tracking Table
CREATE TABLE IF NOT EXISTS `media_uploads` (
  `id` VARCHAR(64) NOT NULL,
  `form_id` VARCHAR(64) NOT NULL,
  `submission_id` VARCHAR(64) NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
  `public_url` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_media_form` (`form_id`),
  KEY `idx_media_submission` (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

