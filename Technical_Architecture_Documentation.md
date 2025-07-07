<!--
  Voice-Activated Banking Platform Documentation
  Enhanced with HTML/CSS, color, and visuals for clarity and beauty
-->

<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7fafd; color: #222; }
  h1, h2, h3 { color: #0074d9; }
  h1 { font-size: 2.5em; border-bottom: 2px solid #00bfff; padding-bottom: 0.2em; }
  h2 { font-size: 2em; margin-top: 2em; border-left: 5px solid #00bfff; padding-left: 0.5em; }
  h3 { font-size: 1.3em; margin-top: 1.5em; }
  .highlight { background: #e6f7ff; border-left: 4px solid #00bfff; padding: 0.5em; margin: 1em 0; }
  .toc a { color: #0074d9; text-decoration: none; font-weight: bold; }
  .toc a:hover { text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; background: #fff; box-shadow: 0 2px 8px #e0e7ef; }
  th, td { border: 1px solid #b3d8f7; padding: 0.7em 1em; text-align: left; }
  th { background: #e6f7ff; color: #0074d9; }
  tr:nth-child(even) { background: #f4faff; }
  .api-table { font-size: 1em; }
  .diagram { display: block; margin: 2em auto; max-width: 600px; border-radius: 12px; box-shadow: 0 2px 12px #b3d8f7; }
  .glossary { background: #f0f8ff; border-left: 4px solid #00bfff; padding: 1em; margin: 1em 0; }
  .roadmap { background: #fffbe6; border-left: 4px solid #ffb300; padding: 1em; margin: 1em 0; }
  .jslib { color: #ff851b; font-weight: bold; }
  .section-img { max-width: 100%; border-radius: 10px; margin: 1em 0; box-shadow: 0 2px 8px #e0e7ef; }
</style>

<!-- Cover Page -->
<div style="text-align:center; margin-top:2em;">
  <img src="https://cdn.pixabay.com/photo/2017/01/10/19/05/bank-1979320_1280.png" alt="Banking Illustration" class="section-img" style="max-width:300px;"/>
  <h1>Voice-Activated Banking Platform</h1>
  <div style="font-size:1.2em; color:#555;">Version 1.0.0 &nbsp;|&nbsp; Author: VBank Engineering Team &nbsp;|&nbsp; Date: July 7, 2025</div>
</div>

---

<div class="toc" style="margin:2em 0;">
  <h2>Table of Contents</h2>
  <ol>
    <li><a href="#executive-summary">Executive Summary</a></li>
    <li><a href="#system-overview">System Overview</a></li>
    <li><a href="#frontend-architecture-and-design-detailed">Frontend Architecture</a></li>
    <li><a href="#backend-architecture-detailed">Backend Architecture</a></li>
    <li><a href="#api-specification">API Specification</a></li>
    <li><a href="#database-design">Database Design</a></li>
    <li><a href="#voice--biometric-modules">Voice & Biometric Modules</a></li>
    <li><a href="#security--compliance">Security & Compliance</a></li>
    <li><a href="#deployment--devops-pipeline">Deployment & DevOps Pipeline</a></li>
    <li><a href="#appendices">Appendices</a></li>
  </ol>
</div>

---

## <span id="executive-summary">Executive Summary</span>
<div class="highlight">
  <b>Voice-Activated Banking Platform</b> is a secure, user-centric application enabling customers to perform banking operations using natural voice commands. Designed for accessibility and robust security, it integrates advanced voice recognition, liveness detection, and biometric authentication to ensure only authorized users can execute sensitive transactions. The platform targets retail banking customers, financial institutions, and accessibility-focused organizations seeking seamless, hands-free banking experiences.
</div>

---

## <span id="system-overview">System Overview</span>

<img src="https://cdn.pixabay.com/photo/2017/06/10/07/18/architecture-2389217_1280.jpg" alt="System Architecture" class="diagram"/>

### Architecture Diagram
<pre style="background:#f4faff; border-left:4px solid #00bfff; padding:1em;">
+-------------------+      +-------------------+      +-------------------+
|   User Device     |<---->|   Frontend (SPA)  |<---->|   Backend (API)   |
| (Mic, Browser)    |      |  (JS, HTML, CSS)  |      |  (App Server)     |
+-------------------+      +-------------------+      +-------------------+
         |                        |                          |
         |<---Voice/Audio-------->|                          |
         |                        |<---REST/JSON----------->|
         |                        |                          |
         |                        |<---DB/Storage----------->|
         |                        |                          |
         |                        |<---Biometric/Voice------>|
</pre>

### Technology Stack
<ul>
  <li><span class="jslib">Frontend:</span> SPA, event-driven, browser APIs for speech/audio, stateful UI, <b>Tailwind CSS</b> for styling.</li>
  <li><span class="jslib">Backend:</span> RESTful API, authentication/session, business logic, biometric/voice integration.</li>
  <li><span class="jslib">Database:</span> Relational, stores user, transaction, and session data.</li>
  <li><span class="jslib">Voice/Biometric:</span> Speech-to-text, text-to-speech, voice matching, liveness detection.</li>
</ul>

---

## Frontend Architecture

### Component Hierarchy
- **App Root**
  - Output Display
  - State Controller
  - SpeechService (recognition/synthesis)
  - MediaRecorderService (audio capture)
  - ApiService (backend communication)
  - TransactionTable (dynamic rendering)

### State Management
- Centralized state machine (`BankAppState`):
    - `AWAITING_ACTIVATION`: Idle, waiting for trigger phrase.
    - `LISTENING_FOR_COMMAND`: Recording and recognizing user command.
    - `PROCESSING`: Sending command/audio to backend, handling OTP/liveness.
    - `PRESENTING`: Presenting results or errors, then resetting.
- All transitions go through a single `transitionToState` method, ensuring cleanup and consistent UI.

### Event Handling & UI Flow
- User says "hello bank" → transitions to command listening.
- On command, records audio, sends to backend.
- If liveness/OTP required, prompts and records OTP audio.
- On backend response, presents result or error, then resets.

### Error Recovery
- All errors (network, backend, speech) are caught and routed to `PRESENTING` state.
- After presenting, always resets to `AWAITING_ACTIVATION`.
- UI and state are never left in an inconsistent state.

---

## Backend Architecture

### API Routing
- Modular blueprint-based routing for all endpoints.
- Endpoints for command processing, OTP generation/verification, authentication, and user/session management.

### Authentication & Session Handling
- JWT-based authentication for all sensitive endpoints.
- Session management for OTP and liveness flows, with expiry and state tracking.

### External Integrations
- Voice/biometric modules for speech recognition, synthesis, and authentication.
- Database for persistent user and transaction data.

---

## Backend Architecture (Detailed)

### High-Level Overview
The backend is a modular, Flask-based REST API server responsible for all business logic, authentication, session management, voice/biometric verification, and database operations. It is structured for maintainability, security, and extensibility.

#### Key Modules:
- **run.py**: Application entry point, configures logging, initializes the Flask app, and ensures database schema creation.
- **intent.py**: Handles all voice command processing, OTP/liveness flows, intent recognition, and transaction logic.
- **auth.py**: Manages user registration and login, including voice and face biometric enrollment and verification.
- **utils.py**: Provides utility functions for OTP generation, normalization, fuzzy matching, audio/face processing, and biometric verification.

### Application Startup & Configuration
- Logging is configured at INFO level with timestamps and log levels for traceability.
- The Flask app is created via a factory (`create_app`), ensuring modularity and testability.
- On startup, the database schema is created if not present.
- The app runs in debug mode for development; production should use a WSGI server and disable debug.

### API Routing & Blueprints
- All endpoints are organized into Flask blueprints (`intent_bp`, `auth_bp`) for separation of concerns.
- Each blueprint encapsulates related routes and logic (e.g., intent, authentication).

### Authentication & Session Handling
- **JWT Authentication**: All sensitive endpoints require a valid JWT access token, created on successful login and checked on each request.
- **Session Management**: Flask session is used for OTP/liveness state, with `session.permanent = True` to ensure persistence across requests. OTPs have expiry timestamps.

### Voice & Biometric Verification
- **Voice Verification**: On registration, user audio is converted to a standard format and stored. On login/command, new audio is compared to the enrolled sample using a voice verification model. Distance thresholds and logging are used for security and debugging.
- **Face Verification**: On registration, a face encoding is extracted and stored. On login, the provided face image is compared to the stored encoding using facial recognition.
- **Liveness/OTP**: For every command, unless already verified in the session, a random OTP is generated, spoken to the user, and must be repeated back. The backend verifies both the voice and the recognized OTP text using fuzzy matching.

### Intent Recognition & Command Processing
- User commands are recognized via speech-to-text and sent to `/process_command`.
- Intent is predicted using a trained logistic regression model on TF-IDF features (intent.py).
- Supported intents: CheckBalance, TransferMoney, GetLastTransactions.
- For transfers, entity extraction parses recipient and amount from the command text.
- All actions are logged for traceability.

### Error Handling & Logging
- All endpoints use try/except/finally blocks for robust error handling.
- Errors are logged with context and returned as structured JSON with appropriate HTTP status codes.
- Resource cleanup (temp files) is always performed in finally blocks.

### API Endpoint Details

| Endpoint              | Method | Auth | Parameters           | Request Format         | Response Format         | Error Handling                |
|----------------------|--------|------|----------------------|------------------------|-------------------------|-------------------------------|
| `/register`          | POST   | No   | email, user_id, audio-file, face-image | multipart/form-data | JSON: message/error    | 400/500 JSON error           |
| `/login`             | POST   | No   | email, audio-file, face-image          | multipart/form-data | JSON: access_token/error | 400/401/404/500 JSON error   |
| `/process_command`   | POST   | Yes  | command, voice_sample| multipart/form-data    | JSON: result, error     | 400/401/404/500 JSON error    |
| `/generate_otp`      | GET    | Yes  | -                    | -                      | JSON: otp_numeric, text | 400/401 JSON error            |
| `/verify_otp_audio`  | POST   | Yes  | otp_audio            | multipart/form-data    | JSON: success, error    | 400/401/404/500 JSON error    |
| `/secret`            | GET    | Yes  | access_token (cookie)| -                      | HTML/JSON               | 401/404 JSON error            |

#### Example: `/process_command` Flow
1. Receives command and voice sample.
2. Authenticates user via JWT.
3. Verifies voice sample against enrolled audio.
4. If liveness/OTP not verified, generates OTP and returns challenge.
5. If OTP verified, predicts intent and executes command (balance, transfer, history).
6. Logs all actions and errors.

#### Example: `/register` Flow
1. Receives email, user_id, audio, and face image.
2. Converts and stores audio, extracts and stores face encoding.
3. Creates new user in database.
4. Returns success or error.

### Utility Functions (utils.py)
- **OTP Generation**: Random 4-digit numeric and text phrase.
- **OTP Normalization & Fuzzy Matching**: Cleans and compares recognized text to expected OTP, allowing for minor errors.
- **Audio Processing**: Converts uploaded audio to standard format for verification.
- **Face Processing**: Extracts face encodings for biometric matching.

### Database Integration
- Uses SQLAlchemy ORM for all database operations.
- User table stores email, user_id, audio_file (binary), face_encoding (array), and balance.
- TransactionHistory table records all transactions with sender, recipient, type, amount, and timestamp.
- All queries are parameterized and indexed for performance.

### Security & Compliance (Backend)
- All sensitive data is encrypted in transit (HTTPS) and at rest (database encryption recommended).
- JWT tokens are used for stateless authentication.
- OTPs and session data are never exposed to the client except as needed for liveness.
- All biometric data is processed and stored securely; no raw images/audio are retained after processing.
- Logging avoids sensitive data exposure.
- All errors are handled gracefully, with no stack traces or sensitive info leaked to clients.

---

## API Specification

<h2 style="margin-top:2em;">API Specification</h2>
<table class="api-table">
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>Method</th>
      <th>Auth</th>
      <th>Parameters</th>
      <th>Request Format</th>
      <th>Response Format</th>
      <th>Error Handling</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>/register</code></td>
      <td>POST</td>
      <td>No</td>
      <td>email, user_id, audio-file, face-image</td>
      <td>multipart/form-data</td>
      <td>JSON: message/error</td>
      <td>400/500 JSON error</td>
    </tr>
    <tr>
      <td><code>/login</code></td>
      <td>POST</td>
      <td>No</td>
      <td>email, audio-file, face-image</td>
      <td>multipart/form-data</td>
      <td>JSON: access_token/error</td>
      <td>400/401/404/500 JSON error</td>
    </tr>
    <tr>
      <td><code>/process_command</code></td>
      <td>POST</td>
      <td>Yes</td>
      <td>command, voice_sample</td>
      <td>multipart/form-data</td>
      <td>JSON: result, error</td>
      <td>400/401/404/500 JSON error</td>
    </tr>
    <tr>
      <td><code>/generate_otp</code></td>
      <td>GET</td>
      <td>Yes</td>
      <td>-</td>
      <td>-</td>
      <td>JSON: otp_numeric, text</td>
      <td>400/401 JSON error</td>
    </tr>
    <tr>
      <td><code>/verify_otp_audio</code></td>
      <td>POST</td>
      <td>Yes</td>
      <td>otp_audio</td>
      <td>multipart/form-data</td>
      <td>JSON: success, error</td>
      <td>400/401/404/500 JSON error</td>
    </tr>
    <tr>
      <td><code>/secret</code></td>
      <td>GET</td>
      <td>Yes</td>
      <td>access_token (cookie)</td>
      <td>-</td>
      <td>HTML/JSON</td>
      <td>401/404 JSON error</td>
    </tr>
  </tbody>
</table>

**Example Request:**
```http
POST /process_command
Authorization: Bearer <token>
Content-Type: multipart/form-data

command=Check my balance
voice_sample=<audio file>
```

**Example Response:**
```json
{
  "balance": 1234.56
}
```

---

## Database Design

### ER Diagram
```
+---------+      +---------------------+
|  User   |<---->| TransactionHistory  |
+---------+      +---------------------+
| user_id |      | transaction_id      |
| email   |      | acc_email           |
| ...     |      | sent_to_email       |
| audio   |      | transaction_type    |
| balance |      | amount              |
+---------+      | timestamp           |
                 +---------------------+
```

### Table Definitions
| Table                | Columns                                         | Indexes                |
|----------------------|-------------------------------------------------|------------------------|
| User                 | user_id (PK), email, audio_file, balance, ...   | user_id, email         |
| TransactionHistory   | transaction_id (PK), acc_email, sent_to_email, transaction_type, amount, timestamp | acc_email, sent_to_email |

### Sample Queries
```sql
-- Get user by email
SELECT * FROM User WHERE email = 'user@example.com';

-- Get last 5 transactions
SELECT * FROM TransactionHistory WHERE acc_email = 'user@example.com' ORDER BY timestamp DESC LIMIT 5;
```

---

## Voice & Biometric Modules

### Speech Recognition & Synthesis
- Converts user audio to text for command and OTP.
- Synthesizes spoken responses for all outputs.

### Intent Handling
- Classifies user command intent (balance, transfer, history) using text analysis.
- Extracts entities (amount, recipient) from recognized text.

### Authentication Flow
```
User Command → Voice Verification →
  If liveness required:
    Generate OTP → Speak OTP → Record OTP →
    Voice & Speech Match →
      If success: Execute command
      Else: Error & Retry
```

---

## Security & Compliance
- All sensitive data encrypted in transit (HTTPS) and at rest.
- JWT authentication for all protected endpoints.
- Session-based OTP and liveness with expiry.
- No sensitive data exposed in logs or client.
- Fallback: On error, system resets to safe state and requires re-authentication.
- Data privacy: Only minimal, necessary data stored per user.

---

## Deployment & DevOps Pipeline
- CI/CD pipeline for automated testing, build, and deployment.
- Environment configuration via environment variables and secrets management.
- Monitoring and alerting for uptime, errors, and security events.
- Rollback strategies: Blue/green deployments, versioned releases.

---

## Appendices

### Glossary
- **SPA:** Single Page Application
- **JWT:** JSON Web Token
- **OTP:** One-Time Password
- **Liveness Detection:** Verifying user is present and not replaying a recording

### References
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

### Future Roadmap
<div class="roadmap">
- Add support for additional biometric factors (face, fingerprint)
- Expand command set (bill pay, account linking)
- Integrate with third-party financial APIs
- Enhance accessibility features (multi-language, screen reader support)
- Advanced fraud detection and anomaly monitoring
</div>

---

## Frontend Architecture and Design (Detailed)

### High-Level Overview
The frontend is a modern, event-driven single-page application (SPA) that provides a seamless, voice-first user experience for banking operations. It is designed for accessibility, security, and extensibility, integrating tightly with the backend for authentication, command execution, and biometric verification.

#### Key Components:
- **index.html**: Login page, guides user through voice and face authentication.
- **register.html**: Registration page, collects and enrolls user voice and face biometrics.
- **bank_index.html**: Main banking dashboard, enables voice-driven banking commands and displays results.
- **app.js**: Orchestrates the login flow, state machine, and voice/camera capture for authentication.
- **bank_script.js**: Manages the banking command flow, state machine, OTP/liveness, and backend integration.
- **register.js**: Handles user registration, including audio recording and face capture.
- **voice_ui_components.js**: Provides reusable classes for speech recognition, synthesis, and media recording.

### Component Hierarchy & UI Flow

```
App Root (HTML)
├── Output/Status Display
├── State Controller (App/BankApp)
│   ├── SpeechService (recognition/synthesis)
│   ├── MediaRecorderService (audio capture)
│   ├── ApiService (backend communication)
│   └── UI Components (forms, tables, camera, audio)
└── TransactionTable (dynamic rendering)
```

- **Login/Registration**: Guides user through multi-step process using voice prompts, audio/face capture, and state transitions.
- **Banking Dashboard**: Listens for activation, processes commands, handles OTP/liveness, and presents results.

### State Management
- Centralized state machines in both login (`AuthAppState`) and banking (`BankAppState`) flows.
- All transitions go through a single `transitionToState` method, ensuring cleanup, consistent UI, and robust error recovery.
- States include: activation, input, confirmation, recording, capturing, processing, presenting, error, and reset.

### Event Handling & UI Flow
- **Voice Activation**: Listens for trigger phrase (e.g., "hello bank" or "hello indu") to start flows.
- **Speech Recognition**: Captures and processes user commands, email, confirmations, and OTPs.
- **Audio Recording**: Uses MediaRecorder API to capture voice samples for authentication and commands.
- **Face Capture**: Uses getUserMedia and Canvas APIs to capture and preview face images.
- **Form Submission**: All data is sent to the backend via `fetch` with FormData, handling both success and error responses.
- **Dynamic UI Updates**: Output/status fields, transaction tables, and error messages are updated in real time based on state and backend responses.

### Error Recovery & Robustness
- All errors (network, backend, speech, device) are caught and routed to a safe state (`PRESENTING` or `ERROR`).
- After presenting a result or error, the app always resets to the initial state, ready for the next user action.
- Defensive coding ensures that UI and state are never left inconsistent, even on unexpected failures.
- Logging and user feedback are provided for all error conditions.

### Integration with Backend
- All API calls are made via `fetch` with proper authentication (JWT in cookies or headers).
- Endpoints for registration, login, command processing, OTP/liveness, and transaction history are fully integrated.
- All backend responses are handled with defensive JSON parsing and error handling.
- State transitions and UI updates are driven by backend responses (e.g., liveness required, OTP success/failure, command results).

### Low-Level Design Details

#### 1. **SpeechService (voice_ui_components.js, bank_script.js, app.js)**
- Wraps browser SpeechRecognition and SpeechSynthesis APIs.
- Handles start/stop, error events, and result callbacks.
- Ensures recognition is stopped before speaking to avoid feedback loops.
- Used for all voice input and output throughout the app.

#### 2. **MediaRecorderService (voice_ui_components.js, bank_script.js, register.js, app.js)**
- Wraps MediaRecorder API for audio capture.
- Handles start/stop, data collection, and blob creation.
- Used for both command/OTP audio and registration/login samples.

#### 3. **ApiService (voice_ui_components.js, bank_script.js, app.js)**
- Centralizes all backend communication (login, command, OTP, etc.).
- Handles JWT token management and error handling.
- Ensures all requests are authenticated and responses are parsed defensively.

#### 4. **State Controllers (AuthApp, BankApp)**
- Each flow (login, registration, banking) is managed by a dedicated class with a state machine.
- All UI actions, API calls, and error handling are routed through state transitions.
- Ensures a consistent, recoverable user experience.

#### 5. **UI Components (register.html, index.html, bank_index.html)**
- Responsive, accessible layouts using modern CSS and Tailwind.
- Dynamic elements for audio/face capture, transaction tables, and status/output.
- All user actions are guided by voice and visual prompts.

#### 6. **Registration Flow (register.js, register.html)**
- Audio and face are captured via browser APIs and attached to a hidden form.
- On submit, FormData is sent to `/register` endpoint.
- Result or error is displayed and logged.

#### 7. **Login Flow (app.js, index.html)**
- Multi-step, voice-driven process: activation → email → confirmation → voice → face → submit.
- All steps are managed by state machine and voice prompts.
- On success, JWT is stored in cookie for subsequent API calls.

#### 8. **Banking Command Flow (bank_script.js, bank_index.html)**
- Listens for activation, records command, sends to backend.
- If liveness/OTP required, prompts and records OTP audio, verifies with backend.
- On success, executes original command and presents result.
- Transaction history is dynamically rendered in a styled table.

#### 9. **Error Handling and Recovery**
- All API and device errors are caught and presented to the user.
- State is always reset after error or completion, preventing stuck UI.
- Defensive checks for device permissions, missing files, and backend failures.

#### 10. **Accessibility and UX**
- All flows are voice-guided and keyboard-accessible.
- Visual feedback (status, output, transaction tables) is provided at every step.
- Responsive design for desktop and mobile.

### Example UI Flow Diagram

```
[AWAITING_ACTIVATION]
    ↓ (trigger phrase)
[LISTENING_FOR_COMMAND]
    ↓ (command spoken)
[PROCESSING]
    ↓ (liveness required)
[OTP PROMPT]
    ↓ (OTP spoken)
[PROCESSING]
    ↓ (result)
[PRESENTING]
    ↓
[AWAITING_ACTIVATION]
```

### Example Code Snippet: State Transition (BankApp)
```javascript
transitionToState(newState) {
  console.log(`[STATE] Transitioning from ${this.state} to ${newState}`);
  // Clean up previous state if needed
  switch (this.state) {
    case BankAppState.LISTENING_FOR_COMMAND:
    case BankAppState.PROCESSING:
      this.speechService.stop();
      this.recorderService.stopRecording();
      break;
  }
  this.state = newState;
  switch (this.state) {
    case BankAppState.AWAITING_ACTIVATION:
      output.textContent = "Say 'hello bank' to begin.";
      this.userCommand = "";
      this.livenessRequired = false;
      this.otpText = null;
      this.otpNumeric = null;
      this.lastCommandBlob = null;
      this.livenessBlob = null;
      try { this.speechService.start(); } catch (e) { console.error(e); }
      break;
    // ...other states...
  }
}
```

### Security and Privacy in the Frontend
- All sensitive data (audio, face images, tokens) is handled in memory and never stored in localStorage or indexedDB.
- JWT tokens are stored in cookies with secure flags.
- All API calls use HTTPS and include authentication headers.
- Device permissions are requested only as needed and released after use.

---
