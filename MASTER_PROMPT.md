# Antigravity Master Prompt — Event Form Builder: Fixes, Enhancements & QA

## Objective

Pull the latest code from the existing repository, inspect the current implementation, and implement all the fixes and enhancements listed below for the Event Form Builder application.

This is an existing application. **Do not rebuild it from scratch.** Work with the current architecture, frameworks, database, components, APIs, authentication system, and UI design. First understand the existing codebase, identify root causes, and then implement the changes.

Treat every numbered requirement as a task that must be completed and tested.

## Phase 1: Initial Repository Inspection

Before making changes:

1. Pull the latest code from the correct Git branch and synchronize with the remote repository.
2. Check the current branch, uncommitted changes, recent commits, and project structure.
3. Preserve any existing user changes. Do not overwrite or discard uncommitted work.
4. Inspect the frontend, backend, database schema, API routes, authentication, file storage, form rendering, response handling, and publishing logic.
5. Identify existing bugs and their root causes before modifying code.
6. Check the existing database migrations and relationships before making schema changes.
7. Create a clear implementation checklist for all 32 requirements below.
8. Implement changes incrementally, reusing existing components and services wherever possible.

Do not stop after creating a plan. Proceed with implementation and testing.

---

## Phase 2: Security and Authentication

### 1. Do not save login credentials

- Do not persist the admin username, password, or other login credentials in local storage, session storage, cookies, URLs, or browser autofill mechanisms controlled by the application.
- Do not hardcode or expose admin credentials anywhere in the frontend.
- Do not automatically populate login fields with previously entered credentials.
- Review authentication persistence and use secure session handling according to the existing authentication architecture.
- Keep authentication tokens and session cookies secure and prevent sensitive information from appearing in logs or error messages.

### 2. Remove the "Back to Home" button from error pages

- Remove the "Back to Home" button from error pages wherever it appears.
- Ensure error pages do not redirect users to a page that exposes admin information.
- If a user ends up on the login page, show only the standard login interface.
- Never display admin credentials, example passwords, debugging details, environment variables, API secrets, or sensitive configuration information on the login page or error screens.
- Show user-friendly error messages without exposing internal implementation details.

**Acceptance criteria:** No credentials are stored or exposed by the application, and error handling does not reveal sensitive information.

---

## Phase 3: QR Code, Public Links and Sharing

### 3. Fix QR code downloads

The existing "Download QR" functionality currently opens the file in a new tab instead of downloading it.

Implement working download actions for both:

- Download QR as an image, preferably PNG.
- Download QR as a PDF.

Requirements:
- Generate or retrieve the QR code using the correct public form URL.
- Trigger an actual file download instead of opening the file in the browser.
- Use meaningful filenames based on the form title.
- Ensure downloaded files open correctly and contain the complete QR code.
- Handle download failures with an appropriate error message.

### 4. Open Public URL and Preview in new tabs

- When the admin clicks "Public URL" or "Preview", open the corresponding form in a new browser tab.
- Do not navigate away from the form listing or editing page.
- Preserve the current editing state.
- Ensure the links point to the correct form, not a generic or previously selected form.
- Apply the behavior consistently across all relevant buttons.

### 5. Dynamic social sharing metadata

When a public form URL is shared on WhatsApp or another supported social platform:

- Use the actual form title as the page title.
- Use a form-specific meta description rather than the application's generic description.
- Use the uploaded form/event image as the social sharing thumbnail.
- Use the correct canonical public URL.
- Provide the appropriate Open Graph metadata, including `og:title`, `og:description`, `og:image`, and `og:url`.
- Add relevant Twitter/X card metadata where appropriate.
- Ensure the metadata is available to social preview crawlers. Client-side JavaScript updates alone may not be sufficient.
- Use the existing framework's server rendering, prerendering, or another compatible solution to make metadata accessible to crawlers.
- Use a sensible fallback description and image only when the form does not have its own image.

**Acceptance criteria:** Different forms generate different sharing titles, descriptions, and thumbnails. Test actual public URLs rather than relying only on the browser's visible page title.

---

## Phase 4: Form Listing and Administration

### 6. Remove Single Response

- Remove the "Single Response" setting and related UI from the form builder.
- Remove associated validation or behavior that depends on collecting an email address to identify repeat submissions.
- Do not introduce email collection as a requirement solely to support this feature.
- Before removing database fields or legacy logic, check whether existing forms depend on them. Preserve historical data and maintain compatibility.

### 7. Remove the Refresh DB button

- Remove the "Refresh DB" button from the Response module.
- Newly submitted responses must be saved automatically through the normal submission API and database transaction.
- The response listing should update automatically after a successful submission, using the existing state-management approach, a refresh of the relevant data, or another appropriate mechanism.
- Do not require administrators to manually refresh or synchronize the database.
- Show a clear error if a submission fails to persist.

### 8. Remove Submission ID from CSV exports

- Exclude the internal Submission ID column from CSV exports.
- Keep useful response information, such as the submission timestamp, respondent answers, and photo URLs.
- Do not remove the internal database ID if it is required for backend relationships or administration.

### 9. Remove the response status graph

- Remove the unnecessary status graph from the individual response/submission result view.
- Response reporting should be based on the questions configured in the form and the answers submitted by respondents.
- Do not introduce redundant status visualizations where every successful submission is already represented in the response records.
- Preserve genuinely useful application-wide analytics elsewhere.

### 10. Add A–Z and Z–A sorting to the response table

- Add sorting controls to the Response table.
- Support alphabetical ascending (A–Z) and descending (Z–A) sorting.
- Allow administrators to select the relevant column to sort, where practical.
- For text answers, use case-insensitive alphabetical sorting.
- Handle empty values consistently.
- Keep sorting compatible with search, filters, and pagination.
- Make the current sort column and direction visually clear.

### 11. Add a Note/Remarks field to each response

- Add a dedicated administrative Note/Remarks field to each response.
- Administrators must be able to add, edit, and save notes against individual submissions.
- Display the note in the response listing so administrators can review remarks without opening every response.
- Keep notes separate from the respondent's answers.
- Notes must not appear on the public form or in respondent-facing confirmation pages.
- Persist notes in the database and associate them with the correct response.
- Preserve notes when the response list is sorted, filtered, refreshed, or revisited.
- Include notes in exports only if appropriate for the existing export workflow; never mix them with respondent-provided answers without clear labeling.

### 12. Change the submission icon on the All Forms page

- Replace the existing submission icon on the All Forms page with a more appropriate, modern icon representing responses or submissions.
- Use the existing icon library and visual design system.
- Ensure the icon is consistent with the rest of the application.
- Do not change unrelated icons or layout elements.

### 13. Remove Open Public Page from side navigation

- Remove "Open Public Page" from the sidebar navigation.
- Public pages must be accessed through the relevant form's Public URL or Preview action.
- Avoid generic navigation that cannot determine which form should be opened.
- Ensure no existing functionality is unintentionally removed from the form listing.

### 14. Show form counts on the Forms page

- Remove the form count from the sidebar navigation if it is incorrect or unreliable.
- Display accurate form counts directly on the Forms page.
- Where the application already supports these categories, show useful counts such as Total Forms, Published, Draft, and Unpublished.
- Derive counts from the actual database records and their current statuses.
- Avoid hardcoded counts or calculations based on incomplete frontend lists.
- Ensure counts remain correct after creating, editing, publishing, unpublishing, or deleting forms.

---

## Phase 5: Form Builder Editing and Navigation

### 15. Implement automatic saving

When an administrator edits a form, changes should be saved automatically.

Requirements:
- Automatically save changes to the form title, description, image, fields, sections, conditions, options, and other editable configuration.
- Use a debounced autosave strategy to prevent unnecessary API requests while typing.
- Persist the latest valid form configuration to the backend.
- Show a subtle save indicator, such as "Saving...", "Saved", or "Save failed".
- Prevent overlapping saves from overwriting newer changes with older data.
- Handle network errors and allow failed changes to be retried.
- Preserve the editing state when navigating between sections.
- Do not silently discard unsaved changes when the browser is refreshed.
- Ensure newly created fields and sections are persisted correctly.

Do not show "Saved" until the backend confirms successful persistence.

### 16. Show Next instead of Submit on intermediate sections

For forms containing multiple sections:

- Display a "Next" button on intermediate sections.
- Display "Previous" on subsequent sections so respondents can navigate backwards.
- Display "Submit" only on the final section.
- Preserve entered answers when moving between sections.
- Validate the current section's required fields before allowing the respondent to continue.
- Display appropriate validation messages without losing the respondent's data.
- Keep the existing single-page submission experience for forms without multiple sections, unless the administrator chooses a different presentation mode.

### 17. Allow changing a field's type after creation

Administrators must be able to change an existing field's type without deleting and recreating the question.

For example:
- Dropdown → Short answer.
- Dropdown → Paragraph.
- Short answer → Dropdown.
- Radio buttons → Checkboxes.
- Any other compatible field type supported by the existing builder.

Requirements:
- Add a field-type selector to the field editing interface.
- Preserve the question title, description, and other compatible properties.
- Display only the configuration options relevant to the selected type.
- Reset or migrate incompatible settings safely.
- Handle existing options appropriately when changing away from or back to an option-based field.
- Warn administrators if a field-type change may invalidate existing configuration or historical response interpretation.
- Never silently delete existing submissions.
- Ensure the saved field type is reflected in the public form immediately after the change is saved.

### 18. Add conditional navigation to the next section

Extend the existing conditional logic so an administrator can configure a button or action to navigate to a particular section.

Requirements:
- Allow a rule or action to specify the destination section.
- Evaluate the relevant conditions using the respondent's current answers.
- Navigate to the correct section when the condition matches.
- Support multiple sections and conditional branching.
- Ensure required fields and validation are respected before moving forward.
- Prevent broken destinations, invalid section references, and navigation loops.
- If no condition matches, follow the configured default navigation.
- Ensure the final applicable section displays Submit rather than Next.
- Recalculate navigation correctly when earlier answers change.

Example: If the respondent answers "Yes" to a particular question, navigate to Section 3. If the answer is "No", navigate to Section 2.

### 19. Add a form presentation mode

If a form contains multiple sections, allow the administrator to choose how the public form is displayed:

**Mode A — All at once**
- Display all sections on a single page.
- Keep questions grouped by their section headings.
- Support the existing conditional visibility rules.
- Show a single Submit action at the end.

**Mode B — Step-by-step**
- Display one applicable section at a time.
- Show Next and Previous controls where appropriate.
- Show Submit on the final applicable section.
- Preserve answers during navigation.
- Respect conditional branching and section visibility.

Requirements:
- Provide this option in the form settings.
- Save the selected mode with the form configuration.
- Apply the mode consistently to Preview and the public URL.
- Keep existing single-page forms working.
- If a section is hidden by a condition, do not display it or require its fields unnecessarily.

### 20. Fix the sticky header in the form builder

- Keep the form builder's top header visible while scrolling through a long form.
- Fix the current issue where the header disappears or gets cut off at the bottom of the scroll area.
- Inspect parent containers, overflow settings, positioning, and z-index values.
- Ensure the header does not overlap field editing controls or dropdown menus.
- Test on common desktop screen sizes and smaller screens.
- Preserve the current visual layout.

### 21. Fix section disappearing when adding conditions

The current issue causes a section to disappear when a condition is added.

Investigate and fix the root cause.

Requirements:
- Sections must remain visible in the builder after conditions are added, edited, saved, or removed.
- Conditional visibility should affect the public form according to the configured rule, not accidentally remove the section from the builder.
- Keep section IDs and field IDs stable.
- Ensure condition changes are persisted and restored correctly after refresh.
- Handle conditions that refer to fields in other sections.
- Ensure empty, incomplete, or temporarily invalid conditions do not corrupt the form configuration.
- Test multiple conditions and nested section layouts where supported.

**Acceptance criteria:** Adding a condition must not delete, hide permanently, reorder unexpectedly, or corrupt the section being edited.

---

## Phase 6: Photo Uploads, Storage and Cleanup

### 22. Compress photos before saving

Whenever a respondent uploads a photo:

- Compress and optimize the image before permanent storage.
- Preserve sufficient image quality for the event's intended use.
- Resize excessively large images to a reasonable maximum dimension.
- Correct image orientation when necessary.
- Prefer efficient formats where supported, while maintaining compatibility with the application.
- Avoid storing unnecessary duplicate copies or full-resolution originals unless required.
- Store the resulting file in the existing file-storage system and keep only the necessary metadata and file reference in the database.
- Ensure uploaded images remain accessible through valid URLs.

Do not break image previews, CSV photo links, or existing forms that use uploaded images.

### 23. Enforce a 5 MB photo upload limit

- The maximum allowed size for an uploaded photo is **5 MB per file**.
- Validate file size on the frontend before upload.
- Enforce the same limit on the backend; frontend validation alone is insufficient.
- Validate the actual uploaded file type and reject unsupported or unsafe file content.
- Show a clear message if the file exceeds 5 MB.
- Do not allow oversized files to bypass validation through direct API requests.
- Ensure compression does not become a way to bypass the original upload limit unless the intended policy is explicitly changed.

### 24. Delete associated files when a form and its responses are deleted

When a form is deleted together with its responses:

- Remove associated uploaded respondent photos and other form-specific files.
- Clean up relevant database records, file references, and metadata.
- Prevent orphaned files from remaining in storage.
- Respect relationships between forms, responses, and uploads.
- Use transactions and reliable cleanup handling wherever possible.
- If files are stored in object storage or on disk, delete them using the appropriate storage service rather than merely deleting their database references.
- Handle failed file deletions safely, with logging and retryable cleanup where appropriate.
- Avoid deleting files that are shared by other forms or records.
- Confirm deletion behavior before making destructive schema or storage changes.

Test the complete deletion flow using a test form with multiple responses and uploaded photos.

### 25. Show photo URLs in CSV exports

- In CSV exports, display the actual URL for each uploaded photo instead of the generic value "Photo".
- Use the correct URL corresponding to the uploaded file.
- Support multiple photo URLs if a field allows multiple uploads, using a consistent separator or clearly structured columns.
- Ensure exported URLs remain valid and accessible according to the application's security model.
- Do not expose internal filesystem paths, private storage keys, or unauthorized files.
- Ensure CSV escaping works correctly for URLs containing special characters.

---

## Phase 7: Response Management and Notifications

### 26. Organize responses by event/form

Redesign the Response module so administrators can identify which event or form received each submission.

Requirements:
- Display a list of forms/events with their corresponding response counts.
- Show useful information such as event/form title, submission count, and most recent submission timestamp.
- Clicking an event/form should open the responses belonging to that specific form.
- Provide a clear way to return to the event/form response listing.
- Include search and useful filtering where appropriate.
- Ensure all response counts are derived from actual records.
- Ensure response records are associated with the correct form.
- Support forms with zero responses.
- Do not mix submissions from different events unless the administrator explicitly selects an all-responses view.

When a new response arrives, make it clear which event or form received it.

### 27. Fix desktop notifications

Desktop notifications should work reliably for new form submissions.

Requirements:
- Use the browser's Notifications API where supported.
- Request notification permission at an appropriate point, such as when an administrator explicitly enables notifications.
- Do not repeatedly request permission or attempt to bypass browser permissions.
- Trigger a notification when a new response is successfully received.
- Include the event/form title and a short submission notification.
- Where appropriate, clicking the notification should open the relevant response or form.
- Prevent duplicate notifications for the same submission.
- Handle denied permissions, unsupported browsers, inactive tabs, and disconnected sessions gracefully.
- Ensure the notification system does not expose sensitive respondent answers or personal information.
- Use the existing backend and frontend architecture to detect new submissions reliably.

If the browser is closed, explain or implement the additional service-worker/push-notification infrastructure required for notifications, rather than falsely claiming that ordinary browser notifications work in the background.

---

## Phase 8: Analytics and Dashboard

### 28. Improve the Analytics visualizations

The current Analytics page shows multiple graphs that look almost identical.

Redesign the analytics section to provide varied, useful visualizations based on the data that actually exists.

Possible visualizations include:
- KPI cards for total forms, total responses, and published forms.
- Bar charts for responses by event/form.
- Line charts for submissions over time.
- Donut charts for answer distributions where categorical answers are available.
- Horizontal bar charts for popular answer options.
- Progress indicators or completion metrics only where the underlying data supports them.
- Tables for detailed response breakdowns where charts are not useful.

Requirements:
- Use different chart types based on the nature of the data.
- Do not display duplicate graphs with the same information.
- Ensure every visualization has a meaningful title, labels, legends, and tooltips where appropriate.
- Support empty states and loading states.
- Use actual database data and real API responses.
- Ensure filters and date ranges, if available, affect the correct visualizations.
- Make the page responsive and visually consistent with the application.
- Do not fabricate metrics or show misleading percentages.
- Preserve useful existing analytics that are already correct.

### 29. Display updated timestamps

- In the form listing or form details view, show the last updated date and time.
- Include both the date and timestamp, rather than only a date.
- Use a consistent and readable format.
- Use the correct database timestamp and an appropriate timezone.
- Ensure the timestamp changes when a successful edit is saved.
- Distinguish last updated time from created time and published time where those values are displayed.

### 30. Add View All Responses to the Dashboard

- The Dashboard currently displays a registration/response list.
- Add a clear "View All Responses" link or action near that list.
- Clicking it should open the Response module and show the appropriate complete listing.
- Where practical, preserve relevant filters or the selected form.
- Ensure the link works even when the dashboard list is empty.
- Keep the dashboard layout clean and consistent with the existing UI.

---

## Phase 9: Form Editing State, Routing and Publishing

### 31. Fix the wrong form opening after a browser refresh

The current bug occurs when an administrator is editing Form A and refreshes the browser, but Form B or the first form in the listing opens instead.

Fix the underlying routing and state-management problem.

Requirements:
- Every form must have a stable unique identifier.
- The edit URL must identify the exact form being edited.
- On page refresh, load the form using its identifier from the current route.
- Never default to the first form in the listing when a valid form identifier is already present.
- Do not rely solely on temporary in-memory component state to determine the selected form.
- Ensure browser refresh, direct URL access, and opening an edit link in a new tab all load the correct form.
- Handle deleted forms and invalid identifiers with a proper error or not-found page.
- Preserve unsaved changes through autosave rather than switching to a different form.
- Check for race conditions in API calls and component initialization.

**Acceptance criteria:** Edit Form A, refresh the page, and confirm Form A remains open with its correct fields, sections, conditions, and settings.

### 32. Automatically unpublish forms after their deadline

The KCL Season 4 form was checked and remained published even after its deadline had passed.

Fix the publishing and deadline logic.

Requirements:
- Inspect how the current deadline is stored and interpreted.
- Determine whether the deadline is a date, a timestamp, or a combination of date and time.
- Define the exact expiration rule consistently and apply the correct timezone.
- Automatically transition expired forms to the appropriate unpublished/expired status.
- Do not depend on an administrator manually opening the form to trigger the status change.
- Implement a reliable scheduled job or equivalent backend mechanism to check for expired published forms.
- Ensure the scheduled job is configured in the actual deployment environment.
- Add server-side enforcement so expired forms cannot accept new submissions even if the scheduled status update is delayed.
- Display an appropriate closed/expired message on the public URL.
- Keep draft, manually unpublished, and expired forms distinguishable where appropriate.
- Ensure the status, form listing, dashboard, and public form remain consistent.
- Test the behavior using a test form with a deadline in the past and another with a future deadline.

Do not change the KCL Season 4 form or other production data destructively while testing.

---

## Phase 10: Quality Assurance and Regression Testing

After implementation, test the complete workflow instead of checking only individual UI changes.

### A. Authentication and security
- Login without storing credentials.
- Logout and session expiration.
- Error page navigation.
- No exposed credentials or secrets.
- Protected admin routes remain protected.

### B. Form builder
- Create a new form.
- Edit an existing form.
- Change field types.
- Add, edit, and remove sections.
- Add and edit conditional logic.
- Confirm sections remain visible in the builder.
- Test Next/Previous/Submit navigation.
- Test both All-at-once and Step-by-step modes.
- Confirm autosave works.
- Refresh the browser while editing Form A and verify Form A remains selected.

### C. Public form
- Open Preview and Public URL in new tabs.
- Submit a single-page form.
- Submit a multi-section form.
- Test conditional navigation.
- Test required fields and validation.
- Test the form deadline and expired-form behavior.
- Verify WhatsApp/social sharing metadata and the form thumbnail.

### D. Responses and exports
- Submit a response and verify automatic database persistence.
- Confirm the response listing updates without a Refresh DB button.
- Add and edit administrative notes.
- Sort A–Z and Z–A.
- Verify event/form-specific response listings and counts.
- Export CSV and verify the Submission ID is excluded.
- Verify photo URLs appear in CSV.
- Verify response data and historical submissions are preserved.

### E. Photos and file management
- Upload a valid image under 5 MB.
- Reject an image larger than 5 MB.
- Test unsupported file types and invalid upload payloads.
- Verify image compression and correct rendering.
- Verify downloaded images and PDFs work.
- Delete a test form with responses and photos, and verify related files are cleaned up.

### F. Notifications and analytics
- Test desktop notification permissions.
- Verify new responses trigger the expected notification.
- Verify duplicate notifications are prevented.
- Confirm analytics are based on actual data.
- Confirm dashboard and response counts are accurate.
- Test empty states and responsive layouts.

### G. Regression testing
- Ensure existing forms continue to work.
- Ensure published forms remain accessible until their deadline.
- Ensure existing submissions are not lost.
- Ensure the changes do not break unrelated functionality.
- Run existing automated tests, linting, type checks, and build commands supported by the project.
- Add or update tests for the fixes wherever practical.

---

## Implementation Rules

1. **Do not rebuild the application.** Make targeted changes to the existing codebase.
2. Do not arbitrarily change the technology stack, UI framework, routing system, or database.
3. Do not introduce duplicate implementations of existing features.
4. Follow the existing naming conventions, component patterns, validation rules, and API design.
5. Implement security-sensitive validation on the backend, not only in the frontend.
6. Do not hardcode form IDs, deadlines, response counts, credentials, or other environment-specific values.
7. Use migrations for required schema changes and preserve existing records.
8. Avoid destructive database resets, truncation, or deletion of production data.
9. Do not remove a feature or field from the database until its existing dependencies and historical data have been reviewed.
10. Keep environment variables and secrets out of source control and frontend bundles.
11. Add appropriate error handling and logging without exposing sensitive information.
12. Ensure changes are compatible with the application's existing deployment setup.
13. Do not mark a task complete merely because the UI was changed; verify the underlying behavior.
14. Do not claim that tests passed unless they were actually executed successfully.
15. If a requirement depends on external infrastructure, configuration, permissions, or deployment changes, implement the application-side work and clearly document the remaining deployment steps.

## Recommended Implementation Order

Work through the requirements in these groups:

1. Repository inspection and security.
2. Routing, form editing state, autosave, and form builder stability.
3. Field types, sections, conditions, and navigation.
4. Public links, QR downloads, social sharing, and form deadlines.
5. Response management, database persistence, notes, sorting, and CSV exports.
6. Photo validation, compression, storage, and cleanup.
7. Notifications, dashboard, analytics, and visual improvements.
8. Full regression testing and final verification.

Resolve shared root causes first. For example, fix the form ID/routing problem before implementing further form editing changes, and fix section/condition persistence before relying on conditional navigation.

## Final Deliverables

After all work is complete, provide a concise implementation report containing:

1. **Completed issues:** List each of the 32 items and mark it Completed, Partially Completed, or Blocked.
2. **Root causes:** Explain the main causes of the existing bugs.
3. **Files changed:** List the important frontend, backend, database, and configuration files modified.
4. **Database changes:** List migrations and schema changes, if any.
5. **Testing results:** Report which tests were executed and whether they passed or failed.
6. **Deployment requirements:** Identify any required scheduler, cron job, storage configuration, notification setup, or environment changes.
7. **Outstanding issues:** Explicitly list anything not completed and explain why.
8. **Git status:** Summarize the branch and working-tree changes. Do not push or deploy without authorization.

**Final instruction:** Begin by inspecting and synchronizing the latest code, then implement the fixes systematically. Do not stop after providing a plan, do not skip any numbered requirement, and do not report completion until the relevant functionality has been verified.
