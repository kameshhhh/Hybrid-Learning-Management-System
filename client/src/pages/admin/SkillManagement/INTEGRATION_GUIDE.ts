/**
 * ============================================================
 * SKILL MANAGEMENT INTEGRATION GUIDE
 * ============================================================
 *
 * This directory contains two complete, production-ready
 * components for managing skills in the LMS Admin panel.
 *
 * ============================================================
 */

/**
 * FILE STRUCTURE:
 * ├── CreateEditSkill.tsx  (598 lines)
 * ├── SkillsList.tsx       (727 lines)
 * └── index.ts             (exports)
 *
 * ============================================================
 */

/**
 * COMPONENT 1: CreateEditSkill.tsx
 * ============================================================
 *
 * A comprehensive form component for creating and editing skills
 *
 * FEATURES:
 * ✓ Form validation with react-hook-form + Zod
 * ✓ File upload for skill thumbnails/covers
 * ✓ Multi-select faculty assignment
 * ✓ Primary faculty designation
 * ✓ Status selection (draft, pending_approval, approved)
 * ✓ Real-time form validation feedback
 * ✓ Loading states and error handling
 * ✓ Glassmorphism UI with TailwindCSS
 * ✓ Character counter for description
 * ✓ Image preview and removal
 *
 * USAGE:
 * ----
 *
 * // Import the component
 * import CreateEditSkill from '@/pages/admin/SkillManagement/CreateEditSkill';
 *
 * // Use in create mode (standalone page)
 * <CreateEditSkill
 *   onSuccess={() => {
 *     // Refresh page or navigate
 *   }}
 * />
 *
 * // Use in edit mode
 * <CreateEditSkill
 *   skill={existingSkill}
 *   onSuccess={handleSuccess}
 *   onCancel={handleCancel}
 * />
 *
 * // Use in modal context
 * <CreateEditSkill
 *   skill={skill}
 *   onSuccess={handleSuccess}
 *   onCancel={handleCancel}
 *   isModal={true}
 * />
 *
 * PROPS:
 * - skill?: Skill              // Optional existing skill for edit mode
 * - onSuccess?: () => void     // Callback after successful submission
 * - onCancel?: () => void      // Callback to close/cancel
 * - isModal?: boolean          // Whether displayed in modal context
 *
 * FORM FIELDS:
 * - Skill Code: Required, uppercase alphanumeric + hyphens/underscores
 * - Name: Required, max 100 characters
 * - Description: Required, 10-1000 characters
 * - Duration: Required, 1-52 weeks
 * - Status: draft | pending_approval | approved
 * - Faculty: Multi-select (at least 1 required)
 * - Primary Faculty: Optional, marks one faculty as primary
 * - Thumbnail: Optional, image file (max 5MB)
 *
 * VALIDATION:
 * Uses Zod schema for comprehensive validation:
 * - Skill code format validation
 * - Name length validation
 * - Description length validation
 * - Duration range validation
 * - Faculty assignment validation
 * - Image type and size validation
 *
 * API CALLS:
 * - adminService.getUsers()    // Fetch faculty members
 * - adminService.createSkill() // Create new skill
 * - adminService.updateSkill() // Update existing skill
 *
 * ============================================================
 */

/**
 * COMPONENT 2: SkillsList.tsx
 * ============================================================
 *
 * A comprehensive skills management page with table, pagination,
 * search, filters, and action buttons
 *
 * FEATURES:
 * ✓ Data table with all skill information
 * ✓ Pagination controls (previous/next and page numbers)
 * ✓ Search functionality (by name/code)
 * ✓ Status filtering (all, draft, pending, approved, active, etc.)
 * ✓ Action buttons (Edit, Delete, Approve, Activate)
 * ✓ Status badge colors with semantic meaning
 * ✓ Delete confirmation modal
 * ✓ Create/Edit modals for inline form display
 * ✓ Loading skeletons for better UX
 * ✓ Empty state with helpful messaging
 * ✓ Real-time data updates from API
 * ✓ Glassmorphism UI design
 *
 * USAGE:
 * ----
 *
 * // Import
 * import SkillsList from '@/pages/admin/SkillManagement/SkillsList';
 *
 * // Use in your routing
 * // In App.tsx or routing config:
 * {
 *   path: '/admin/skills',
 *   element: <SkillsList />
 * }
 *
 * // Or render directly
 * <SkillsList />
 *
 * TABLE COLUMNS:
 * - Code: Skill code
 * - Name: Skill name with thumbnail preview
 * - Duration: Duration in weeks
 * - Faculty: Count of assigned faculty
 * - Status: Status badge with color coding
 * - Students: Count of enrolled students
 * - Actions: Edit, Delete, Approve, Activate buttons
 *
 * STATUS COLORS:
 * - Draft: Gray/Default
 * - Pending Approval: Yellow/Warning
 * - Approved: Blue/Info
 * - Active: Green/Success
 * - Rejected: Red/Danger
 * - Archived: Gray/Default
 *
 * ACTION BUTTONS (context-dependent):
 * - Edit: Opens edit modal
 * - Delete: Shows confirmation modal
 * - Approve: Available for pending_approval status
 * - Activate: Available for approved status
 *
 * MODALS:
 * 1. Delete Confirmation: Prevents accidental deletion
 * 2. Create/Edit Form: In-page form for creating/editing skills
 *
 * PAGINATION:
 * - Default limit: 10 items per page
 * - Shows current page / total pages
 * - Previous/Next buttons
 * - Page number buttons
 *
 * SEARCH & FILTERS:
 * - Search by skill name or code (real-time)
 * - Filter by status
 * - Resets to page 1 when filters change
 *
 * API CALLS:
 * - adminService.getSkills()    // Fetch skills with pagination
 * - adminService.updateSkill()  // Update skill
 * - adminService.approveSkill() // Approve pending skills
 * - adminService.activateSkill() // Activate approved skills
 * - adminService.deleteUser()   // Delete skill (Note: using deleteUser for now)
 *
 * ============================================================
 */

/**
 * INTEGRATION STEPS
 * ============================================================
 *
 * 1. ROUTING:
 *    In your App.tsx or router configuration, add:
 *
 *    import { SkillsList } from '@/pages/admin/SkillManagement';
 *
 *    {
 *      path: '/admin/skills',
 *      element: <SkillsList />,
 *      requiresRole: 'admin'
 *    }
 *
 * 2. NAVIGATION:
 *    Add link in your admin navigation:
 *
 *    <Link to="/admin/skills">
 *      <SkillIcon /> Skills Management
 *    </Link>
 *
 * 3. STANDALONE FORM:
 *    If you need just the form (not the list):
 *
 *    import { CreateEditSkill } from '@/pages/admin/SkillManagement';
 *
 *    <CreateEditSkill
 *      onSuccess={() => navigate('/admin/skills')}
 *    />
 *
 * ============================================================
 */

/**
 * DEPENDENCIES
 * ============================================================
 *
 * The components use these already-installed dependencies:
 *
 * - react-hook-form: Form state and validation
 * - zod: Schema validation
 * - @hookform/resolvers: Zod resolver for react-hook-form
 * - react-hot-toast: Toast notifications
 * - lucide-react: Icons (Plus, Edit2, Trash2, etc.)
 * - zustand: Auth store access (for token)
 * - axios: HTTP client (via services/api)
 *
 * No additional packages needed!
 *
 * ============================================================
 */

/**
 * ERROR HANDLING
 * ============================================================
 *
 * Components include comprehensive error handling:
 *
 * 1. Form Validation Errors:
 *    - Real-time field validation with error messages
 *    - Prevents submission with invalid data
 *
 * 2. API Errors:
 *    - Network error handling
 *    - 401/403/404/500 error handling
 *    - User-friendly error messages via toast
 *
 * 3. File Upload Errors:
 *    - File type validation
 *    - File size validation
 *    - Image format validation
 *
 * 4. Loading States:
 *    - Loading skeletons during data fetch
 *    - Disabled buttons during submission
 *    - Loading spinners in forms
 *
 * ============================================================
 */

/**
 * STYLING & CUSTOMIZATION
 * ============================================================
 *
 * Components use TailwindCSS + Glassmorphism:
 *
 * - GlassCard: Base card component with glass effect
 * - Gradient text for headers
 * - Responsive grid layouts
 * - Smooth transitions and animations
 * - Semantic color usage (success, warning, danger, info)
 *
 * To customize:
 * 1. Modify Tailwind class names directly in components
 * 2. Update color scheme in tailwind.config.js
 * 3. Modify spacing/padding in GlassCard sizes
 *
 * ============================================================
 */

/**
 * PERFORMANCE CONSIDERATIONS
 * ============================================================
 *
 * 1. Pagination:
 *    - Default 10 items per page reduces DOM nodes
 *    - Can adjust pagination.limit in SkillsList
 *
 * 2. Loading Skeletons:
 *    - Shows 5 skeleton rows during loading
 *    - Better than spinners for table context
 *
 * 3. Memoization:
 *    - fetchSkills uses useCallback to prevent infinite loops
 *    - Pagination state changes trigger new fetch
 *
 * 4. Search Optimization:
 *    - Search is debounced at component level
 *    - Reset to page 1 when search/filters change
 *
 * ============================================================
 */

/**
 * BACKEND API EXPECTATIONS
 * ============================================================
 *
 * The components expect these API endpoints to exist:
 *
 * GET /api/v1/admin/skills
 *   Params: page, limit, search, status
 *   Response: PaginatedResponse<Skill[]>
 *
 * POST /api/v1/admin/skills
 *   Body: FormData with skill data and file
 *   Response: { success: boolean, data: Skill }
 *
 * PUT /api/v1/admin/skills/{id}
 *   Body: FormData with skill updates and file
 *   Response: { success: boolean, data: Skill }
 *
 * DELETE /api/v1/admin/skills/{id}
 *   Response: { success: boolean }
 *
 * POST /api/v1/admin/skills/{id}/approve
 *   Response: { success: boolean, data: Skill }
 *
 * POST /api/v1/admin/skills/{id}/activate
 *   Response: { success: boolean, data: Skill }
 *
 * GET /api/v1/admin/users?role=faculty
 *   Response: { success: boolean, data: { items: User[] } }
 *
 * ============================================================
 */

/**
 * TESTING CHECKLIST
 * ============================================================
 *
 * [ ] Create new skill with all fields
 * [ ] Edit existing skill
 * [ ] Delete skill with confirmation
 * [ ] Search skills by name
 * [ ] Search skills by code
 * [ ] Filter by status
 * [ ] Pagination navigation works
 * [ ] Faculty assignment works
 * [ ] Primary faculty selection works
 * [ ] Image upload works
 * [ ] Form validation works
 * [ ] Approve pending skills
 * [ ] Activate approved skills
 * [ ] Empty state displays correctly
 * [ ] Loading states show correctly
 * [ ] Error messages display correctly
 * [ ] Toast notifications work
 *
 * ============================================================
 */

export {};
