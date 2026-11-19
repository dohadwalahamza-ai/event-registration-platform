// scripts/export_seed_to_mysql.js
// Exports existing forms, form fields, and admin accounts into clean MySQL INSERT statements.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read seedData.ts to extract sample forms
const seedDataPath = path.resolve(__dirname, '../src/services/seedData.ts');
const seedContent = fs.readFileSync(seedDataPath, 'utf8');

// Parse active forms and fields
import('../src/services/seedData.ts').then((seed) => {
  const forms = seed.SAMPLE_FORMS || [];
  let sql = `-- =======================================================\n`;
  sql += `-- EVENT FORM BUILDER – DATA MIGRATION SEED SCRIPT\n`;
  sql += `-- =======================================================\n\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 1. Admin User
  sql += `-- 1. Seed Default Administrator\n`;
  sql += `INSERT INTO \`users\` (\`id\`, \`email\`, \`password_hash\`, \`name\`, \`role\`, \`created_at\`, \`updated_at\`) VALUES (\n`;
  sql += `  'admin-primary',\n`;
  sql += `  'admin@admin.com',\n`;
  // bcrypt hash for 'admin@123'
  sql += `  '$2b$12$eX03m5sO1r2N5E5tJj3Vn.aC3b1m4b8g5J8o0K4n3H9g7L1f8w9y2',\n`;
  sql += `  'Administrator',\n`;
  sql += `  'admin',\n`;
  sql += `  NOW(3),\n`;
  sql += `  NOW(3)\n`;
  sql += `) ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n\n`;

  // 2. Forms
  sql += `-- 2. Seed Forms\n`;
  for (const f of forms) {
    const themeConfigStr = JSON.stringify(f.theme_config || {}).replace(/'/g, "\\'");
    const descStr = (f.description || '').replace(/'/g, "\\'");
    const titleStr = (f.title || '').replace(/'/g, "\\'");
    const venueStr = (f.venue || 'NA').replace(/'/g, "\\'");

    sql += `INSERT INTO \`forms\` (\n`;
    sql += `  \`id\`, \`owner_id\`, \`title\`, \`slug\`, \`description\`, \`cover_image_url\`,\n`;
    sql += `  \`event_date\`, \`venue\`, \`status\`, \`theme_config\`, \`presentation_mode\`,\n`;
    sql += `  \`success_message\`, \`published_version\`, \`created_at\`, \`updated_at\`\n`;
    sql += `) VALUES (\n`;
    sql += `  '${f.id}',\n`;
    sql += `  '${f.owner_id || 'admin'}',\n`;
    sql += `  '${titleStr}',\n`;
    sql += `  '${f.slug}',\n`;
    sql += `  '${descStr}',\n`;
    sql += `  ${f.cover_image_url ? `'${f.cover_image_url}'` : 'NULL'},\n`;
    sql += `  ${f.event_date ? `'${f.event_date.replace('T', ' ')}:00'` : 'NULL'},\n`;
    sql += `  '${venueStr}',\n`;
    sql += `  '${f.status || 'published'}',\n`;
    sql += `  '${themeConfigStr}',\n`;
    sql += `  '${f.presentation_mode || 'step_by_step'}',\n`;
    sql += `  '${(f.success_message || '').replace(/'/g, "\\'")}',\n`;
    sql += `  ${f.published_version || 1},\n`;
    sql += `  NOW(3),\n`;
    sql += `  NOW(3)\n`;
    sql += `) ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`), \`updated_at\` = NOW(3);\n\n`;

    // 3. Form Fields
    if (Array.isArray(f.fields) && f.fields.length > 0) {
      sql += `-- 3. Fields for form: ${f.id} (${f.title})\n`;
      for (const field of f.fields) {
        const labelStr = (field.label || '').replace(/'/g, "\\'");
        const placeholderStr = field.placeholder ? `'${field.placeholder.replace(/'/g, "\\'")}'` : 'NULL';
        const optionsStr = field.options ? `'${JSON.stringify(field.options).replace(/'/g, "\\'")}'` : 'NULL';
        const validationStr = field.validation_rules ? `'${JSON.stringify(field.validation_rules).replace(/'/g, "\\'")}'` : 'NULL';
        const conditionalStr = field.conditional_rules ? `'${JSON.stringify(field.conditional_rules).replace(/'/g, "\\'")}'` : 'NULL';
        const configStr = field.configuration ? `'${JSON.stringify(field.configuration).replace(/'/g, "\\'")}'` : 'NULL';

        sql += `INSERT INTO \`form_fields\` (\n`;
        sql += `  \`id\`, \`form_id\`, \`field_key\`, \`label\`, \`field_type\`, \`placeholder\`, \`required\`,\n`;
        sql += `  \`options\`, \`validation_rules\`, \`conditional_rules\`, \`sort_order\`, \`configuration\`, \`created_at\`\n`;
        sql += `) VALUES (\n`;
        sql += `  '${field.id}',\n`;
        sql += `  '${field.form_id}',\n`;
        sql += `  '${field.field_key}',\n`;
        sql += `  '${labelStr}',\n`;
        sql += `  '${field.field_type}',\n`;
        sql += `  ${placeholderStr},\n`;
        sql += `  ${field.required ? 1 : 0},\n`;
        sql += `  ${optionsStr},\n`;
        sql += `  ${validationStr},\n`;
        sql += `  ${conditionalStr},\n`;
        sql += `  ${field.sort_order || 0},\n`;
        sql += `  ${configStr},\n`;
        sql += `  NOW(3)\n`;
        sql += `) ON DUPLICATE KEY UPDATE \`label\` = VALUES(\`label\`), \`required\` = VALUES(\`required\`);\n\n`;
      }
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  const outputPath = path.resolve(__dirname, 'seed.mysql.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`✅ Successfully generated MySQL migration seed at: ${outputPath}`);
}).catch((err) => {
  console.error('Error generating seed SQL:', err);
});

