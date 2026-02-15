# Use Case Templates
## Personalized Therapeutic Story Platform

---

## VISITOR USE CASES

### UC-V-01: Browse Stories

**Use Case ID:** UC-V-01  
**Use Case Name:** Browse Stories  
**Actor:** Visitor  
**Priority:** High  
**Type:** Primary

**Description:**  
Visitor can browse available story templates without authentication.

**Preconditions:**
- Visitor is on the platform homepage
- Story templates are available in the system

**Postconditions:**
- Visitor views a list of available story templates
- Visitor can see story categories, titles, and basic information

**Main Success Scenario:**
1. Visitor navigates to the browse page
2. System displays available story templates
3. System shows templates grouped by category, age, or topic
4. Visitor can scroll through the list
5. Visitor can click on a story to view details (UC-V-03)

**Alternative Flows:**
- **2a.** No stories available: System displays "No stories found" message
- **3a.** Visitor filters by category: System shows filtered results
- **3b.** Visitor sorts by popularity: System reorders templates

**Exception Flows:**
- **E1:** Database connection error: System displays error message
- **E2:** Network timeout: System shows retry option

**Business Rules:**
- Only approved story templates are displayed
- Templates are sorted by default (e.g., popularity, date)
- Visitor can browse without authentication

**Related Use Cases:**
- Includes: View Story Details (UC-V-03)
- Extends: Search Stories (UC-V-02)

---

### UC-V-02: Search Stories

**Use Case ID:** UC-V-02  
**Use Case Name:** Search Stories  
**Actor:** Visitor  
**Priority:** High  
**Type:** Primary

**Description:**  
Visitor can search for story templates using keywords, topics, or situations.

**Preconditions:**
- Visitor is on the platform
- Search functionality is available

**Postconditions:**
- Search results are displayed
- Visitor can refine search criteria

**Main Success Scenario:**
1. Visitor enters search query (title, topic, situation)
2. System searches story templates
3. System displays matching results
4. Visitor can view details of any result (UC-V-03)

**Alternative Flows:**
- **2a.** No matches found: System displays "No results found" with suggestions
- **2b.** Multiple matches: System displays paginated results
- **3a.** Visitor refines search: System updates results

**Exception Flows:**
- **E1:** Invalid search query: System validates and shows error
- **E2:** Search service unavailable: System displays error message

**Business Rules:**
- Search matches against title, primaryTopic, specificSituation fields
- Search is case-insensitive
- Results are sorted by relevance

**Related Use Cases:**
- Extends: Browse Stories (UC-V-01)

---

### UC-V-03: View Story Details

**Use Case ID:** UC-V-03  
**Use Case Name:** View Story Details  
**Actor:** Visitor  
**Priority:** High  
**Type:** Primary

**Description:**  
Visitor views detailed information about a story template.

**Preconditions:**
- Visitor has selected a story from browse or search results
- Story template exists and is approved

**Postconditions:**
- Visitor views complete story details
- Visitor can access related actions (read samples, personalize, etc.)

**Main Success Scenario:**
1. Visitor clicks on a story template
2. System retrieves story details from database
3. System displays story information (title, description, age range, topics, sample pages)
4. Visitor can read story samples (UC-V-04)
5. Visitor can start personalization (UC-V-07)

**Alternative Flows:**
- **2a.** Story not found: System displays error and redirects to browse
- **3a.** Story has images: System displays image gallery
- **4a.** Visitor is authenticated: System shows "Personalize" button

**Exception Flows:**
- **E1:** Story data corrupted: System displays error message
- **E2:** Images fail to load: System shows placeholder

**Business Rules:**
- Only approved stories are viewable
- Story details include metadata (age, topics, therapeutic goals)
- Sample pages are limited (e.g., first 2-3 pages)

**Related Use Cases:**
- Included by: Browse Stories (UC-V-01), Search Stories (UC-V-02)
- Includes: Read Story Samples (UC-V-04)

---

### UC-V-04: Read Story Samples

**Use Case ID:** UC-V-04  
**Use Case Name:** Read Story Samples  
**Actor:** Visitor  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Visitor can read sample pages of a story template before personalizing.

**Preconditions:**
- Visitor is viewing story details (UC-V-03)
- Story template has sample pages available

**Postconditions:**
- Visitor has read sample content
- Visitor can decide to personalize or continue browsing

**Main Success Scenario:**
1. Visitor clicks "Read Sample" or views sample section
2. System displays sample pages (first 2-3 pages)
3. Visitor reads through sample pages
4. Visitor can navigate between sample pages
5. Visitor decides to personalize (UC-V-07) or continue browsing

**Alternative Flows:**
- **2a.** No samples available: System displays message
- **3a.** Visitor wants full story: System prompts for personalization
- **4a.** Visitor scrolls through: System shows page indicators

**Exception Flows:**
- **E1:** Sample content unavailable: System shows error
- **E2:** Images fail to load: System shows text-only version

**Business Rules:**
- Sample pages are limited to prevent full story access
- Sample includes title page and first 1-2 content pages
- Full story requires personalization and purchase

**Related Use Cases:**
- Included by: View Story Details (UC-V-03)

---

### UC-V-05: Log In / Register

**Use Case ID:** UC-V-05  
**Use Case Name:** Log In / Register  
**Actor:** Visitor  
**Priority:** High  
**Type:** Primary

**Description:**  
Visitor can create an account or log in to access personalized features.

**Preconditions:**
- Visitor is on the platform
- Visitor is not authenticated

**Postconditions:**
- Visitor is authenticated
- Visitor can access personalized features

**Main Success Scenario:**
1. Visitor clicks "Log In" or "Register"
2. System displays authentication form
3. Visitor enters credentials (email/password) or registers new account
4. System validates credentials
5. System authenticates visitor via Firebase Auth
6. System redirects visitor to appropriate page
7. Visitor can now personalize stories, purchase, etc.

**Alternative Flows:**
- **3a.** Visitor registers: System creates new account, sends verification email
- **3b.** Visitor uses social login: System handles OAuth flow
- **4a.** Invalid credentials: System displays error message
- **4b.** Account not verified: System prompts for email verification

**Exception Flows:**
- **E1:** Authentication service unavailable: System displays error
- **E2:** Network error: System shows retry option
- **E3:** Email already exists (registration): System shows login option

**Business Rules:**
- Email must be valid format
- Password must meet security requirements (min length, complexity)
- Email verification required for new accounts
- Session persists across browser sessions

**Related Use Cases:**
- Required for: Personalize Story (UC-V-07), Purchase Story (UC-V-10), View Purchased Stories (UC-V-11)

---

### UC-V-06: Personalize Story

**Use Case ID:** UC-V-06  
**Use Case Name:** Personalize Story  
**Actor:** Visitor  
**Priority:** High  
**Type:** Primary

**Description:**  
Authenticated visitor personalizes a story template with child information and preferences.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has selected a story template (UC-V-03)
- Story template is approved and available

**Postconditions:**
- Personalized story session is created
- Child information is saved
- Story images are generated (if applicable)
- Visitor can purchase the personalized story

**Main Success Scenario:**
1. Visitor clicks "Personalize Story" on story details page
2. System displays personalization form
3. Visitor enters child information:
   - Child name
   - Gender (male/female/neutral)
   - Uploads child photo (optional)
   - Selects visual style
4. Visitor clicks "Continue" or "Personalize"
5. System validates input
6. System saves personalization session to Firestore
7. System generates personalized story images (via AI Service)
8. System displays preview of personalized story
9. Visitor can purchase (UC-V-10) or save for later (UC-V-08)

**Alternative Flows:**
- **3a.** Visitor uploads photo: System processes and stores image
- **3b.** Visitor skips photo: System uses default avatar
- **7a.** Image generation fails: System retries or uses fallback
- **8a.** Visitor wants to edit: System allows modification (UC-V-09)

**Exception Flows:**
- **E1:** Validation fails: System displays field-specific errors
- **E2:** Photo upload fails: System shows error, allows retry
- **E3:** AI service unavailable: System queues image generation
- **E4:** Session save fails: System shows error, allows retry

**Business Rules:**
- Child name is required
- Gender must be selected
- Photo is optional but recommended
- Visual style must be selected from available options
- Personalization session expires after 30 days of inactivity
- One active personalization session per story template per user

**Related Use Cases:**
- Extends: Resume Personalization (UC-V-08), Start New Personalization (UC-V-09)
- Includes: AI Service (Secondary Actor)
- Required for: Purchase Story (UC-V-10)

---

### UC-V-07: Resume Personalization

**Use Case ID:** UC-V-07  
**Use Case Name:** Resume Personalization  
**Actor:** Visitor  
**Priority:** Medium  
**Type:** Extension

**Description:**  
Visitor resumes a previously started but incomplete personalization session.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has an incomplete personalization session
- Session has not expired

**Postconditions:**
- Visitor continues personalization from saved state
- Session data is restored

**Main Success Scenario:**
1. Visitor navigates to "My Stories" or personalization page
2. System retrieves incomplete personalization sessions
3. System displays list of sessions with story titles and dates
4. Visitor selects a session to resume
5. System loads saved personalization data
6. System displays personalization form with saved values
7. Visitor continues from where they left off (UC-V-06)

**Alternative Flows:**
- **2a.** No incomplete sessions: System shows empty state
- **4a.** Session expired: System prompts to start new
- **6a.** Data corrupted: System allows starting fresh

**Exception Flows:**
- **E1:** Session not found: System displays error
- **E2:** Database error: System shows error message

**Business Rules:**
- Sessions expire after 30 days of inactivity
- Only user's own sessions are accessible
- Maximum 5 incomplete sessions per user

**Related Use Cases:**
- Extends: Personalize Story (UC-V-06)

---

### UC-V-08: Start New Personalization

**Use Case ID:** UC-V-08  
**Use Case Name:** Start New Personalization  
**Actor:** Visitor  
**Priority:** Medium  
**Type:** Extension

**Description:**  
Visitor starts a new personalization session for a story template, even if they have existing sessions.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has selected a story template (UC-V-03)

**Postconditions:**
- New personalization session is created
- Previous session for same template is archived (if exists)

**Main Success Scenario:**
1. Visitor is on story details page
2. Visitor clicks "Start New Personalization"
3. System checks for existing sessions for this template
4. System prompts to confirm (if existing session found)
5. Visitor confirms
6. System creates new personalization session
7. System displays personalization form (UC-V-06)

**Alternative Flows:**
- **3a.** No existing session: System proceeds directly to form
- **4a.** Visitor cancels: System returns to story details
- **5a.** Visitor wants to resume instead: System redirects to resume (UC-V-07)

**Exception Flows:**
- **E1:** Cannot create session: System displays error
- **E2:** Maximum sessions reached: System prompts to complete or delete existing

**Business Rules:**
- User can have multiple sessions for different templates
- Only one active session per template per user
- Starting new session archives previous session for same template

**Related Use Cases:**
- Extends: Personalize Story (UC-V-06)

---

### UC-V-09: Purchase Story

**Use Case ID:** UC-V-09  
**Use Case Name:** Purchase Story  
**Actor:** Visitor  
**Priority:** High  
**Type:** Primary

**Description:**  
Authenticated visitor purchases a personalized story to access the full content.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has personalized a story (UC-V-06)
- Story personalization is complete
- Payment gateway is available

**Postconditions:**
- Story purchase is recorded
- Visitor gains access to full story
- Payment transaction is processed
- Story is added to visitor's library

**Main Success Scenario:**
1. Visitor views personalized story preview
2. Visitor clicks "Purchase Story"
3. System displays payment form
4. Visitor enters payment information
5. System validates payment data
6. System sends payment request to Payment Gateway
7. Payment Gateway processes payment
8. Payment Gateway returns success confirmation
9. System records purchase in database
10. System grants access to full story
11. System adds story to visitor's library (UC-V-10)
12. System displays confirmation and redirects to story reader

**Alternative Flows:**
- **4a.** Visitor uses saved payment method: System pre-fills form
- **7a.** Payment fails: System displays error, allows retry
- **7b.** Payment pending: System shows pending status
- **10a.** Story already purchased: System shows message and grants access

**Exception Flows:**
- **E1:** Payment Gateway unavailable: System shows error, queues retry
- **E2:** Payment declined: System displays reason, allows alternative payment
- **E3:** Transaction timeout: System shows error, allows retry
- **E4:** Database error after payment: System logs issue, manual review required

**Business Rules:**
- Payment is required for full story access
- One purchase per personalized story instance
- Purchase grants lifetime access to that story
- Refunds follow platform policy
- Payment methods: credit card, PayPal, etc.

**Related Use Cases:**
- Includes: Payment Gateway (Secondary Actor)
- Required for: View Purchased Stories (UC-V-10)

---

### UC-V-10: View Purchased Stories

**Use Case ID:** UC-V-10  
**Use Case Name:** View Purchased Stories  
**Actor:** Visitor  
**Priority:** High  
**Type:** Primary

**Description:**  
Authenticated visitor views their library of purchased personalized stories.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has at least one purchased story

**Postconditions:**
- Visitor views their story library
- Visitor can access purchased stories

**Main Success Scenario:**
1. Visitor navigates to "My Library" or "Purchased Stories"
2. System retrieves visitor's purchased stories from database
3. System displays list of purchased stories with thumbnails
4. Visitor can view story details
5. Visitor can download PDF (UC-V-11)
6. Visitor can listen to story (UC-V-12)
7. Visitor can share story (UC-V-15)

**Alternative Flows:**
- **2a.** No purchased stories: System displays empty state with browse option
- **3a.** Many stories: System displays paginated list
- **4a.** Visitor filters by date: System shows filtered results
- **5a.** Visitor searches library: System filters displayed stories

**Exception Flows:**
- **E1:** Database error: System displays error message
- **E2:** Stories not loading: System shows retry option

**Business Rules:**
- Only purchased stories are displayed
- Stories are sorted by purchase date (newest first)
- Visitor has lifetime access to purchased stories
- Stories can be accessed across devices

**Related Use Cases:**
- Includes: Download Story as PDF (UC-V-11), Listen to Story (UC-V-12), Share Story (UC-V-15)

---

### UC-V-11: Download Story as PDF

**Use Case ID:** UC-V-11  
**Use Case Name:** Download Story as PDF  
**Actor:** Visitor  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Visitor downloads a purchased personalized story as a PDF file.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has purchased the story (UC-V-09)
- Story is available in library (UC-V-10)

**Postconditions:**
- PDF file is downloaded to visitor's device
- PDF contains full personalized story

**Main Success Scenario:**
1. Visitor views purchased story in library (UC-V-10)
2. Visitor clicks "Download PDF"
3. System generates PDF from personalized story content
4. System retrieves story images from Storage Service
5. System creates PDF document with story pages
6. System initiates download
7. PDF file is saved to visitor's device

**Alternative Flows:**
- **3a.** PDF already generated: System downloads cached version
- **4a.** Images missing: System uses placeholders or regenerates
- **5a.** Large file: System shows progress indicator

**Exception Flows:**
- **E1:** PDF generation fails: System shows error, allows retry
- **E2:** Storage Service unavailable: System queues generation
- **E3:** Download interrupted: System allows resume
- **E4:** Browser blocks download: System shows instructions

**Business Rules:**
- PDF includes all story pages
- PDF includes personalized child name and images
- PDF is watermarked with platform branding
- PDF generation may take time for large stories
- Visitor can download PDF multiple times

**Related Use Cases:**
- Included by: View Purchased Stories (UC-V-10)
- Includes: Storage Service (Secondary Actor)

---

### UC-V-12: Listen to Story

**Use Case ID:** UC-V-12  
**Use Case Name:** Listen to Story  
**Actor:** Visitor  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Visitor listens to an audio version of a purchased personalized story.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has purchased the story (UC-V-09)
- Story is available in library (UC-V-10)
- Audio version is available

**Postconditions:**
- Audio playback starts
- Visitor can control playback

**Main Success Scenario:**
1. Visitor views purchased story in library (UC-V-10)
2. Visitor clicks "Listen to Story"
3. System retrieves audio file from Storage Service
4. System displays audio player interface
5. Visitor clicks play
6. System streams audio content
7. Visitor can pause, resume, adjust volume, skip pages

**Alternative Flows:**
- **3a.** Audio not generated: System generates audio on-demand
- **4a.** Audio loading: System shows loading indicator
- **6a.** Visitor wants to read along: System displays text synchronized with audio

**Exception Flows:**
- **E1:** Audio file not found: System generates audio or shows error
- **E2:** Streaming fails: System shows error, allows retry
- **E3:** Network interruption: System pauses and resumes when available
- **E4:** Browser doesn't support audio: System shows alternative

**Business Rules:**
- Audio is generated using text-to-speech
- Audio includes personalized child name pronunciation
- Audio can be paused and resumed
- Audio playback position is saved
- Audio is available for all purchased stories

**Related Use Cases:**
- Included by: View Purchased Stories (UC-V-10)
- Includes: Storage Service (Secondary Actor)

---

### UC-V-13: Add Story to Favorites

**Use Case ID:** UC-V-13  
**Use Case Name:** Add Story to Favorites  
**Actor:** Visitor  
**Priority:** Low  
**Type:** Primary

**Description:**  
Authenticated visitor adds a story template to their favorites list.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor is viewing a story template (UC-V-03)

**Postconditions:**
- Story is added to visitor's favorites
- Favorite indicator is displayed

**Main Success Scenario:**
1. Visitor views story details (UC-V-03)
2. Visitor clicks "Add to Favorites" button
3. System saves story to visitor's favorites in database
4. System updates UI to show "Favorited" state
5. Visitor can view favorites later (UC-V-14)

**Alternative Flows:**
- **2a.** Story already favorited: System removes from favorites (toggle)
- **3a.** Maximum favorites reached: System shows message, prompts to remove old

**Exception Flows:**
- **E1:** Save fails: System shows error, allows retry
- **E2:** Database error: System displays error message

**Business Rules:**
- Maximum 50 favorites per user
- Favorites persist across sessions
- User can remove favorites anytime
- Favorites are private to user

**Related Use Cases:**
- Includes: View Favorite Stories (UC-V-14)

---

### UC-V-14: View Favorite Stories

**Use Case ID:** UC-V-14  
**Use Case Name:** View Favorite Stories  
**Actor:** Visitor  
**Priority:** Low  
**Type:** Primary

**Description:**  
Authenticated visitor views their list of favorited story templates.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has at least one favorited story

**Postconditions:**
- Visitor views their favorites list
- Visitor can access favorited stories

**Main Success Scenario:**
1. Visitor navigates to "Favorites" page
2. System retrieves visitor's favorites from database
3. System displays list of favorited story templates
4. Visitor can click on any story to view details (UC-V-03)
5. Visitor can remove from favorites
6. Visitor can personalize favorited stories (UC-V-06)

**Alternative Flows:**
- **2a.** No favorites: System displays empty state with browse option
- **3a.** Many favorites: System displays paginated list
- **5a.** Story no longer available: System shows "Unavailable" status

**Exception Flows:**
- **E1:** Database error: System displays error message
- **E2:** Favorites not loading: System shows retry option

**Business Rules:**
- Favorites are sorted by date added (newest first)
- Favorites can be reordered by user
- Removed stories disappear from list immediately

**Related Use Cases:**
- Included by: Add Story to Favorites (UC-V-13)

---

### UC-V-15: Share Story

**Use Case ID:** UC-V-15  
**Use Case Name:** Share Story  
**Actor:** Visitor  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Visitor shares a purchased personalized story via social media or link.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Visitor has purchased the story (UC-V-09)
- Story is available in library (UC-V-10)

**Postconditions:**
- Share link or content is generated
- Story is shared via selected method

**Main Success Scenario:**
1. Visitor views purchased story in library (UC-V-10)
2. Visitor clicks "Share Story"
3. System displays sharing options (social media, email, link)
4. Visitor selects sharing method
5. System generates shareable content/link
6. System retrieves story preview from Storage Service
7. Visitor completes sharing action
8. System records share event (optional analytics)

**Alternative Flows:**
- **4a.** Visitor copies link: System copies to clipboard
- **4b.** Visitor shares via email: System opens email client
- **4c.** Visitor shares via social media: System opens sharing dialog
- **6a.** Preview image missing: System generates on-demand

**Exception Flows:**
- **E1:** Sharing service unavailable: System shows error
- **E2:** Link generation fails: System shows error, allows retry
- **E3:** Storage Service unavailable: System uses fallback preview

**Business Rules:**
- Shared links provide preview only (full story requires purchase)
- Shared content includes story title and preview image
- Sharing is optional and doesn't grant access to full story
- Share links expire after 30 days (optional)

**Related Use Cases:**
- Included by: View Purchased Stories (UC-V-10)
- Includes: Storage Service (Secondary Actor)

---

### UC-V-16: Send Request to Admin

**Use Case ID:** UC-V-16  
**Use Case Name:** Send Request to Admin  
**Actor:** Visitor  
**Priority:** Low  
**Type:** Primary

**Description:**  
Authenticated visitor sends a request or feedback to platform administrators.

**Preconditions:**
- Visitor is authenticated (UC-V-05)
- Contact/request functionality is available

**Postconditions:**
- Request is submitted
- Request is queued for admin review

**Main Success Scenario:**
1. Visitor navigates to "Contact" or "Request" page
2. Visitor fills out request form (subject, message, category)
3. Visitor submits request
4. System validates form data
5. System saves request to database
6. System sends notification to admin
7. System displays confirmation message
8. Admin reviews request (UC-A-07)

**Alternative Flows:**
- **2a.** Visitor selects category: System shows relevant fields
- **4a.** Validation fails: System displays field-specific errors
- **6a.** Notification fails: System logs request, admin checks queue

**Exception Flows:**
- **E1:** Submission fails: System shows error, allows retry
- **E2:** Database error: System displays error message
- **E3:** Form timeout: System saves draft, allows resume

**Business Rules:**
- Request must include subject and message
- Request is assigned to admin queue
- Visitor receives confirmation email
- Admin responds within 48 hours (target)

**Related Use Cases:**
- Required for: Review Visitor Requests (UC-A-07)

---

## SPECIALIST USE CASES

### UC-S-01: Login (Specialist)

**Use Case ID:** UC-S-01  
**Use Case Name:** Login (Specialist)  
**Actor:** Specialist  
**Priority:** High  
**Type:** Primary

**Description:**  
Specialist logs into the platform to access specialist features.

**Preconditions:**
- Specialist has an account with specialist role
- Specialist is on login page

**Postconditions:**
- Specialist is authenticated
- Specialist can access specialist dashboard

**Main Success Scenario:**
1. Specialist navigates to specialist login page
2. Specialist enters credentials (email/password)
3. System validates credentials
4. System verifies specialist role
5. System authenticates via Firebase Auth
6. System redirects to specialist dashboard
7. Specialist can access specialist features

**Alternative Flows:**
- **3a.** Invalid credentials: System displays error message
- **4a.** Not a specialist account: System denies access, shows error
- **5a.** Account suspended: System displays suspension message

**Exception Flows:**
- **E1:** Authentication service unavailable: System displays error
- **E2:** Network error: System shows retry option

**Business Rules:**
- Only accounts with specialist role can access
- Session expires after inactivity period
- Multi-factor authentication may be required

**Related Use Cases:**
- Required for: All specialist use cases

---

### UC-S-02: List All Drafts

**Use Case ID:** UC-S-02  
**Use Case Name:** List All Drafts  
**Actor:** Specialist  
**Priority:** High  
**Type:** Primary

**Description:**  
Specialist views a list of all story drafts they have created or are assigned to.

**Preconditions:**
- Specialist is authenticated (UC-S-01)
- Specialist has access to drafts

**Postconditions:**
- Specialist views list of drafts
- Specialist can filter and sort drafts

**Main Success Scenario:**
1. Specialist navigates to "Drafts" page
2. System retrieves drafts from database (filtered by specialist)
3. System displays list of drafts with status, date, story title
4. Specialist can filter by status (pending, in-review, approved, rejected)
5. Specialist can sort by date or status
6. Specialist can click on draft to review (UC-S-05)

**Alternative Flows:**
- **2a.** No drafts: System displays empty state
- **4a.** Specialist filters by status: System shows filtered results
- **5a.** Many drafts: System displays paginated list

**Exception Flows:**
- **E1:** Database error: System displays error message
- **E2:** Drafts not loading: System shows retry option

**Business Rules:**
- Specialist can only see their own drafts
- Drafts are sorted by creation date (newest first)
- Draft status is clearly displayed
- Admin can also view all drafts (UC-A-08)

**Related Use Cases:**
- Required for: Review Story Draft (UC-S-05)
- Also used by: Admin (UC-A-08)

---

### UC-S-03: Create Story Brief

**Use Case ID:** UC-S-03  
**Use Case Name:** Create Story Brief  
**Actor:** Specialist  
**Priority:** High  
**Type:** Primary

**Description:**  
Specialist creates a story brief that defines requirements for story generation.

**Preconditions:**
- Specialist is authenticated (UC-S-01)
- Specialist has access to brief creation

**Postconditions:**
- Story brief is created and saved
- Brief is ready for draft generation

**Main Success Scenario:**
1. Specialist navigates to "Create Brief" page
2. System displays brief creation form
3. Specialist enters brief details:
   - Title
   - Therapeutic focus
   - Child profile (age, gender, interests)
   - Therapeutic intent
   - Language and tone preferences
   - Safety constraints
   - Story preferences (length, style)
4. Specialist submits brief
5. System validates brief data
6. System saves brief to database
7. System displays confirmation
8. Specialist can generate draft (UC-S-04)

**Alternative Flows:**
- **3a.** Specialist uses template: System pre-fills common fields
- **4a.** Validation fails: System displays field-specific errors
- **6a.** Brief saved as draft: System allows later completion

**Exception Flows:**
- **E1:** Save fails: System shows error, allows retry
- **E2:** Database error: System displays error message
- **E3:** Form timeout: System saves draft automatically

**Business Rules:**
- Brief must include therapeutic focus and child profile
- Brief is saved to specialist_story_briefs collection
- Brief can be edited before draft generation
- Brief is associated with specialist account

**Related Use Cases:**
- Includes: Generate Story Draft (UC-S-04)

---

### UC-S-04: Generate Story Draft

**Use Case ID:** UC-S-04  
**Use Case Name:** Generate Story Draft  
**Actor:** Specialist  
**Priority:** High  
**Type:** Primary

**Description:**  
Specialist generates a story draft from a story brief using AI services.

**Preconditions:**
- Specialist is authenticated (UC-S-01)
- Specialist has created a story brief (UC-S-03)
- AI Service is available

**Postconditions:**
- Story draft is generated
- Draft is saved to database
- Draft is ready for review

**Main Success Scenario:**
1. Specialist selects a story brief (UC-S-03)
2. Specialist clicks "Generate Draft"
3. System retrieves brief from database
4. System retrieves RAG context (therapeutic principles, writing rules)
5. System calls AI Service with brief and context
6. AI Service generates story content
7. System generates story images (via AI Service)
8. System saves draft to database
9. System stores images in Storage Service
10. System displays draft preview
11. Specialist can review draft (UC-S-05)

**Alternative Flows:**
- **5a.** RAG context unavailable: System uses default context
- **6a.** Generation takes time: System shows progress indicator
- **7a.** Image generation fails: System retries or uses placeholders
- **9a.** Storage fails: System queues storage retry

**Exception Flows:**
- **E1:** AI Service unavailable: System shows error, queues generation
- **E2:** Generation fails: System shows error, allows retry
- **E3:** Database save fails: System shows error, allows retry
- **E4:** Timeout: System shows error, allows retry

**Business Rules:**
- Draft generation uses GPT-5-mini model
- Draft includes all story pages with text and images
- Draft status is set to "pending" initially
- Generation may take several minutes
- Draft is associated with brief and specialist

**Related Use Cases:**
- Included by: Create Story Brief (UC-S-03)
- Includes: Review Story Draft (UC-S-05)
- Includes: AI Service (Secondary Actor), Storage Service (Secondary Actor)

---

### UC-S-05: Review Story Draft

**Use Case ID:** UC-S-05  
**Use Case Name:** Review Story Draft  
**Actor:** Specialist  
**Priority:** High  
**Type:** Primary

**Description:**  
Specialist reviews a generated story draft to evaluate quality and therapeutic value.

**Preconditions:**
- Specialist is authenticated (UC-S-01)
- Story draft exists and is generated (UC-S-04)
- Draft is assigned to specialist

**Postconditions:**
- Draft is reviewed
- Specialist can edit (UC-S-06) or approve (UC-S-07)

**Main Success Scenario:**
1. Specialist selects draft from list (UC-S-02)
2. System retrieves draft from database
3. System displays draft with all pages
4. Specialist reviews story content, images, therapeutic alignment
5. Specialist evaluates against brief requirements
6. Specialist makes decision:
   - Edit draft (UC-S-06), or
   - Approve draft (UC-S-07)
7. System updates draft status

**Alternative Flows:**
- **4a.** Draft has many pages: System displays paginated view
- **5a.** Specialist wants to compare with brief: System shows brief side-by-side
- **6a.** Specialist requests changes: System allows editing (UC-S-06)

**Exception Flows:**
- **E1:** Draft not found: System displays error
- **E2:** Draft data corrupted: System shows error, allows regeneration
- **E3:** Images not loading: System shows placeholders

**Business Rules:**
- Specialist can only review their own drafts
- Draft must be reviewed before approval
- Review comments can be saved
- Draft status changes based on action

**Related Use Cases:**
- Included by: List All Drafts (UC-S-02), Generate Story Draft (UC-S-04)
- Extends: Edit Draft (UC-S-06), Approve Draft (UC-S-07)
- Also used by: Admin (UC-A-09, UC-A-10)

---

### UC-S-06: Edit Draft

**Use Case ID:** UC-S-06  
**Use Case Name:** Edit Draft  
**Actor:** Specialist  
**Priority:** Medium  
**Type:** Extension

**Description:**  
Specialist edits a story draft to improve content or fix issues.

**Preconditions:**
- Specialist is authenticated (UC-S-01)
- Specialist is reviewing a draft (UC-S-05)
- Draft is in editable state

**Postconditions:**
- Draft is modified
- Changes are saved
- Draft status may change

**Main Success Scenario:**
1. Specialist clicks "Edit Draft" during review (UC-S-05)
2. System displays draft in edit mode
3. Specialist modifies content:
   - Edits text on pages
   - Requests image regeneration
   - Adjusts story flow
4. Specialist saves changes
5. System validates edits
6. System saves updated draft to database
7. System displays confirmation
8. Specialist can review again (UC-S-05)

**Alternative Flows:**
- **3a.** Specialist edits single page: System saves only that page
- **3b.** Specialist requests full regeneration: System triggers new generation (UC-S-04)
- **4a.** Specialist cancels: System discards changes

**Exception Flows:**
- **E1:** Save fails: System shows error, allows retry
- **E2:** Validation fails: System displays field-specific errors
- **E3:** Concurrent edit: System shows conflict resolution

**Business Rules:**
- Edits are versioned (draft history maintained)
- Only specialist who created draft can edit
- Edits reset draft status to "pending"
- Major edits may require re-generation

**Related Use Cases:**
- Extends: Review Story Draft (UC-S-05)

---

### UC-S-07: Approve Draft

**Use Case ID:** UC-S-07  
**Use Case Name:** Approve Draft  
**Actor:** Specialist  
**Priority:** High  
**Type:** Extension

**Description:**  
Specialist approves a story draft, making it available as a story template.

**Preconditions:**
- Specialist is authenticated (UC-S-01)
- Specialist has reviewed draft (UC-S-05)
- Draft meets quality and therapeutic standards

**Postconditions:**
- Draft is approved
- Draft is converted to story template
- Template is available for visitors

**Main Success Scenario:**
1. Specialist reviews draft (UC-S-05)
2. Specialist confirms draft meets requirements
3. Specialist clicks "Approve Draft"
4. System validates draft completeness
5. System converts draft to story template
6. System saves template to story_templates collection
7. System updates draft status to "approved"
8. System makes template available for visitors
9. System displays confirmation
10. Template appears in browse/search results

**Alternative Flows:**
- **4a.** Draft incomplete: System shows missing elements, prevents approval
- **5a.** Template already exists: System updates existing template
- **8a.** Template needs admin approval: System queues for admin review

**Exception Flows:**
- **E1:** Approval fails: System shows error, allows retry
- **E2:** Database error: System displays error message
- **E3:** Template conversion fails: System shows error, allows retry

**Business Rules:**
- Only reviewed drafts can be approved
- Approved drafts become story templates
- Templates are immediately available (or after admin approval)
- Approval is final (cannot be undone easily)

**Related Use Cases:**
- Extends: Review Story Draft (UC-S-05)
- Also used by: Admin (UC-A-10)

---

## ADMIN USE CASES

### UC-A-01: Login (Admin)

**Use Case ID:** UC-A-01  
**Use Case Name:** Login (Admin)  
**Actor:** Admin  
**Priority:** High  
**Type:** Primary

**Description:**  
Admin logs into the platform to access administrative features.

**Preconditions:**
- Admin has an account with admin role
- Admin is on login page

**Postconditions:**
- Admin is authenticated
- Admin can access admin dashboard

**Main Success Scenario:**
1. Admin navigates to admin login page
2. Admin enters credentials (email/password)
3. System validates credentials
4. System verifies admin role
5. System authenticates via Firebase Auth
6. System redirects to admin dashboard
7. Admin can access all admin features

**Alternative Flows:**
- **3a.** Invalid credentials: System displays error message
- **4a.** Not an admin account: System denies access
- **5a.** Multi-factor authentication required: System prompts for MFA

**Exception Flows:**
- **E1:** Authentication service unavailable: System displays error
- **E2:** Network error: System shows retry option

**Business Rules:**
- Only accounts with admin role can access
- Admin sessions have extended timeout
- Admin actions are logged for audit

**Related Use Cases:**
- Required for: All admin use cases

---

### UC-A-02: Manage Users

**Use Case ID:** UC-A-02  
**Use Case Name:** Manage Users  
**Actor:** Admin  
**Priority:** High  
**Type:** Primary

**Description:**  
Admin manages user accounts (visitors) including viewing, suspending, and deleting accounts.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Admin has user management permissions

**Postconditions:**
- User accounts are managed
- Changes are logged

**Main Success Scenario:**
1. Admin navigates to "User Management" page
2. System retrieves list of all users
3. System displays user list with details (email, role, status, registration date)
4. Admin can search/filter users
5. Admin selects a user
6. Admin performs action:
   - View user details
   - Suspend account
   - Activate account
   - Delete account (with confirmation)
7. System validates action
8. System updates user account
9. System logs admin action
10. System displays confirmation

**Alternative Flows:**
- **4a.** Admin searches by email: System filters results
- **6a.** Admin views user activity: System displays user history
- **6b.** Admin exports user list: System generates CSV file

**Exception Flows:**
- **E1:** User not found: System displays error
- **E2:** Action fails: System shows error, allows retry
- **E3:** Permission denied: System shows error message

**Business Rules:**
- Admin can view all user accounts
- Suspended users cannot log in
- Deleted accounts are soft-deleted (data retained for audit)
- All admin actions are logged
- Admin cannot delete their own account

**Related Use Cases:**
- None

---

### UC-A-03: Manage Specialists

**Use Case ID:** UC-A-03  
**Use Case Name:** Manage Specialists  
**Actor:** Admin  
**Priority:** High  
**Type:** Primary

**Description:**  
Admin manages specialist accounts including creating, suspending, and managing specialist permissions.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Admin has specialist management permissions

**Postconditions:**
- Specialist accounts are managed
- Changes are logged

**Main Success Scenario:**
1. Admin navigates to "Specialist Management" page
2. System retrieves list of all specialists
3. System displays specialist list with details (email, status, drafts count)
4. Admin can search/filter specialists
5. Admin selects a specialist
6. Admin performs action:
   - Create new specialist account
   - View specialist details and drafts
   - Suspend specialist account
   - Activate specialist account
   - Modify specialist permissions
7. System validates action
8. System updates specialist account
9. System logs admin action
10. System displays confirmation

**Alternative Flows:**
- **4a.** Admin searches by email: System filters results
- **6a.** Admin views specialist activity: System displays draft history
- **6b.** Admin assigns specialist to draft: System updates draft assignment

**Exception Flows:**
- **E1:** Specialist not found: System displays error
- **E2:** Action fails: System shows error, allows retry
- **E3:** Permission denied: System shows error message

**Business Rules:**
- Admin can create specialist accounts
- Specialist accounts have specialist role
- Suspended specialists cannot access platform
- All admin actions are logged
- Admin can view all specialist drafts

**Related Use Cases:**
- None

---

### UC-A-04: Manage Payments

**Use Case ID:** UC-A-04  
**Use Case Name:** Manage Payments  
**Actor:** Admin  
**Priority:** High  
**Type:** Primary

**Description:**  
Admin manages payment transactions, processes refunds, and views payment reports.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Admin has payment management permissions
- Payment Gateway is available

**Postconditions:**
- Payment transactions are managed
- Refunds are processed (if applicable)
- Payment data is updated

**Main Success Scenario:**
1. Admin navigates to "Payment Management" page
2. System retrieves payment transactions from database
3. System displays transaction list (date, user, amount, status)
4. Admin can filter by status, date, user
5. Admin selects a transaction
6. Admin performs action:
   - View transaction details
   - Process refund (via Payment Gateway)
   - Update transaction status
   - Export payment report
7. System validates action
8. System processes payment action via Payment Gateway (if needed)
9. System updates transaction in database
10. System logs admin action
11. System displays confirmation

**Alternative Flows:**
- **4a.** Admin filters by failed transactions: System shows only failed
- **6a.** Admin processes bulk refund: System handles multiple refunds
- **6b.** Admin views payment analytics: System displays charts/reports

**Exception Flows:**
- **E1:** Payment Gateway unavailable: System shows error, queues action
- **E2:** Refund fails: System shows error from Payment Gateway
- **E3:** Transaction not found: System displays error

**Business Rules:**
- Admin can view all payment transactions
- Refunds follow platform refund policy
- Payment Gateway handles actual refund processing
- All payment actions are logged
- Payment reports can be exported

**Related Use Cases:**
- Includes: Payment Gateway (Secondary Actor)

---

### UC-A-05: Moderate Content

**Use Case ID:** UC-A-05  
**Use Case Name:** Moderate Content  
**Actor:** Admin  
**Priority:** High  
**Type:** Primary

**Description:**  
Admin moderates story templates, personalized stories, and user-generated content for quality and safety.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Admin has content moderation permissions
- Content exists for moderation

**Postconditions:**
- Content is reviewed and moderated
- Content status is updated

**Main Success Scenario:**
1. Admin navigates to "Content Moderation" page
2. System retrieves content requiring moderation (pending approval, flagged content)
3. System displays content list (type, title, status, flags)
4. Admin selects content item
5. System displays full content for review
6. Admin reviews content for:
   - Quality standards
   - Safety and appropriateness
   - Therapeutic value
   - Policy compliance
7. Admin makes decision:
   - Approve content
   - Reject content (with reason)
   - Request changes
8. System updates content status
9. System logs moderation action
10. System notifies content creator (if applicable)
11. System displays confirmation

**Alternative Flows:**
- **3a.** No content pending: System displays empty state
- **4a.** Admin filters by content type: System shows filtered results
- **7a.** Admin flags for review: System queues for specialist review

**Exception Flows:**
- **E1:** Content not found: System displays error
- **E2:** Update fails: System shows error, allows retry
- **E3:** Content data corrupted: System shows error

**Business Rules:**
- Only approved content is visible to visitors
- Rejected content is hidden but retained
- Moderation decisions are final
- All moderation actions are logged
- Content creators are notified of decisions

**Related Use Cases:**
- None

---

### UC-A-06: Review Reports

**Use Case ID:** UC-A-06  
**Use Case Name:** Review Reports  
**Actor:** Admin  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Admin views system reports and analytics including user activity, story usage, and platform metrics.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Admin has report access permissions
- Report data is available

**Postconditions:**
- Admin views requested reports
- Reports can be exported

**Main Success Scenario:**
1. Admin navigates to "Reports" page
2. System displays available report types
3. Admin selects report type:
   - User activity report
   - Story usage report
   - Revenue report
   - Content performance report
4. System retrieves report data from database
5. System generates report (charts, tables, summaries)
6. System displays report
7. Admin can filter by date range, category
8. Admin can export report (PDF, CSV)
9. Admin can schedule automated reports

**Alternative Flows:**
- **3a.** Admin selects custom report: System shows report builder
- **5a.** Large dataset: System shows loading indicator
- **7a.** Admin compares periods: System displays comparison view

**Exception Flows:**
- **E1:** Report generation fails: System shows error
- **E2:** Data unavailable: System shows message
- **E3:** Export fails: System shows error, allows retry

**Business Rules:**
- Reports are generated on-demand
- Historical data is available
- Reports can be exported in multiple formats
- Automated reports can be scheduled
- Report access is logged

**Related Use Cases:**
- None

---

### UC-A-07: Review Visitor Requests

**Use Case ID:** UC-A-07  
**Use Case Name:** Review Visitor Requests  
**Actor:** Admin  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Admin reviews and responds to requests and feedback submitted by visitors.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Visitor requests exist in queue
- Admin has request management permissions

**Postconditions:**
- Request is reviewed
- Response is sent (if applicable)
- Request status is updated

**Main Success Scenario:**
1. Admin navigates to "Visitor Requests" page
2. System retrieves pending requests from database
3. System displays request list (date, visitor, subject, status)
4. Admin selects a request
5. System displays full request details
6. Admin reviews request content
7. Admin responds to request:
   - Send email response
   - Mark as resolved
   - Assign to another admin
   - Escalate if needed
8. System saves response
9. System sends notification to visitor
10. System updates request status
11. System logs admin action
12. System displays confirmation

**Alternative Flows:**
- **3a.** No pending requests: System displays empty state
- **4a.** Admin filters by category: System shows filtered results
- **7a.** Admin views visitor history: System displays previous requests

**Exception Flows:**
- **E1:** Request not found: System displays error
- **E2:** Email send fails: System shows error, allows retry
- **E3:** Save fails: System shows error, allows retry

**Business Rules:**
- Requests are sorted by date (oldest first)
- Admin should respond within 48 hours
- Request status tracks: pending, in-progress, resolved, closed
- All responses are logged
- Visitor receives email notification

**Related Use Cases:**
- Required by: Send Request to Admin (UC-V-16)

---

### UC-A-08: List All Drafts (Admin)

**Use Case ID:** UC-A-08  
**Use Case Name:** List All Drafts (Admin)  
**Actor:** Admin  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Admin views all story drafts from all specialists for oversight and management.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Admin has draft access permissions

**Postconditions:**
- Admin views all drafts
- Admin can filter and manage drafts

**Main Success Scenario:**
1. Admin navigates to "All Drafts" page
2. System retrieves all drafts from database (all specialists)
3. System displays draft list with specialist, status, date, title
4. Admin can filter by specialist, status, date
5. Admin can sort by various criteria
6. Admin can click on draft to review (UC-A-09)
7. Admin can approve draft (UC-A-10)

**Alternative Flows:**
- **3a.** No drafts: System displays empty state
- **4a.** Admin filters by specialist: System shows filtered results
- **5a.** Many drafts: System displays paginated list

**Exception Flows:**
- **E1:** Database error: System displays error message
- **E2:** Drafts not loading: System shows retry option

**Business Rules:**
- Admin can see all drafts from all specialists
- Drafts are sorted by creation date (newest first)
- Admin has same review/approve capabilities as specialist
- Admin actions override specialist actions

**Related Use Cases:**
- Similar to: List All Drafts (UC-S-02)
- Includes: Review Story Draft (UC-A-09), Approve Draft (UC-A-10)

---

### UC-A-09: Review Story Draft (Admin)

**Use Case ID:** UC-A-09  
**Use Case Name:** Review Story Draft (Admin)  
**Actor:** Admin  
**Priority:** Medium  
**Type:** Primary

**Description:**  
Admin reviews any story draft for quality control and oversight.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Story draft exists
- Admin has draft review permissions

**Postconditions:**
- Draft is reviewed by admin
- Admin can approve or request changes

**Main Success Scenario:**
1. Admin selects draft from list (UC-A-08)
2. System retrieves draft from database
3. System displays draft with all pages
4. Admin reviews story content, images, therapeutic alignment
5. Admin evaluates quality and compliance
6. Admin makes decision:
   - Approve draft (UC-A-10), or
   - Request changes (notify specialist)
7. System updates draft status
8. System notifies specialist (if changes requested)
9. System logs admin action

**Alternative Flows:**
- **4a.** Draft has many pages: System displays paginated view
- **6a.** Admin wants to compare with brief: System shows brief
- **6b.** Admin delegates to specialist: System assigns back to specialist

**Exception Flows:**
- **E1:** Draft not found: System displays error
- **E2:** Draft data corrupted: System shows error
- **E3:** Notification fails: System logs action, manual notification needed

**Business Rules:**
- Admin can review any draft
- Admin review takes precedence over specialist review
- Admin can override specialist decisions
- All admin review actions are logged

**Related Use Cases:**
- Included by: List All Drafts (UC-A-08)
- Extends: Approve Draft (UC-A-10)

---

### UC-A-10: Approve Draft (Admin)

**Use Case ID:** UC-A-10  
**Use Case Name:** Approve Draft (Admin)  
**Actor:** Admin  
**Priority:** High  
**Type:** Primary

**Description:**  
Admin approves a story draft, making it available as a story template.

**Preconditions:**
- Admin is authenticated (UC-A-01)
- Admin has reviewed draft (UC-A-09)
- Draft meets quality and therapeutic standards

**Postconditions:**
- Draft is approved
- Draft is converted to story template
- Template is available for visitors

**Main Success Scenario:**
1. Admin reviews draft (UC-A-09)
2. Admin confirms draft meets requirements
3. Admin clicks "Approve Draft"
4. System validates draft completeness
5. System converts draft to story template
6. System saves template to story_templates collection
7. System updates draft status to "approved"
8. System makes template available for visitors
9. System notifies specialist of approval
10. System logs admin action
11. System displays confirmation
12. Template appears in browse/search results

**Alternative Flows:**
- **4a.** Draft incomplete: System shows missing elements, prevents approval
- **5a.** Template already exists: System updates existing template
- **9a.** Notification fails: System logs action

**Exception Flows:**
- **E1:** Approval fails: System shows error, allows retry
- **E2:** Database error: System displays error message
- **E3:** Template conversion fails: System shows error, allows retry

**Business Rules:**
- Admin approval is final
- Approved drafts become story templates immediately
- Admin can approve drafts that specialist hasn't approved
- All approvals are logged
- Specialist is notified of admin approval

**Related Use Cases:**
- Extends: Review Story Draft (UC-A-09)
- Similar to: Approve Draft (UC-S-07)

---

## SECONDARY ACTORS

### AI Service (OpenAI)

**Actor Type:** External System  
**Description:**  
Provides AI-powered story generation and image generation services.

**Use Cases:**
- Generate Story Draft (UC-S-04)
- Personalize Story (UC-V-06)

**Interactions:**
- Receives story briefs and personalization data
- Generates story content using GPT-5-mini model
- Generates personalized story images
- Returns generated content to system

---

### Payment Gateway

**Actor Type:** External System  
**Description:**  
Handles payment processing and transaction management.

**Use Cases:**
- Purchase Story (UC-V-09)
- Manage Payments (UC-A-04)

**Interactions:**
- Receives payment requests
- Processes credit card/PayPal transactions
- Handles refunds
- Returns transaction status to system

---

### Storage Service

**Actor Type:** External System  
**Description:**  
Stores and manages generated content files (images, PDFs, audio).

**Use Cases:**
- Generate Story Draft (UC-S-04)
- Download Story as PDF (UC-V-11)
- Listen to Story (UC-V-12)
- Share Story (UC-V-15)

**Interactions:**
- Stores generated story images
- Stores PDF files
- Stores audio files
- Provides file download URLs
- Manages file access permissions

---

## USE CASE RELATIONSHIPS SUMMARY

### Includes Relationships:
- Browse Stories includes View Story Details
- View Story Details includes Read Story Samples
- View Purchased Stories includes Download PDF, Listen to Story, Share Story
- Add Story to Favorites includes View Favorite Stories
- Create Story Brief includes Generate Story Draft
- Generate Story Draft includes Review Story Draft

### Extends Relationships:
- Personalize Story extends Resume Personalization
- Personalize Story extends Start New Personalization
- Review Story Draft extends Edit Draft
- Review Story Draft extends Approve Draft

---

## GLOSSARY

- **Story Template:** Approved story structure that can be personalized
- **Personalized Story:** Story template customized with child information
- **Story Brief:** Requirements document for generating a story draft
- **Story Draft:** AI-generated story content awaiting review and approval
- **RAG:** Retrieval-Augmented Generation - context retrieval for AI
- **Therapeutic Focus:** Specific therapeutic goal or area (e.g., anxiety, social skills)
- **Child Profile:** Information about the child (name, age, gender, interests)
- **Visual Style:** Art style for story images (watercolor, cartoon, etc.)

---

*Document Version: 1.0*  
*Last Updated: [Current Date]*
