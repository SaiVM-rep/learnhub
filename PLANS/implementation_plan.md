# Implementation Plan: AI Learning Chatbot Integration

## Goal Description
The objective is to implement a robust AI chatbot specifically designed to assist users while they are learning on the platform (e.g., engaging with course materials). The backend will integrate with Anthropic's API (Claude model) to generate responses, and the frontend will use a floating or integrated chat widget inside the `CourseDetailPage` so students can ask questions contextually. 

This plan is structured so that an AI Agent (like Claude 3.7 Sonnet) can execute it systematically, resulting in a ready-to-merge Pull Request.

---

## Proposed Changes

### 1. Backend: API & AI Integration (`c:\Users\saivi\OneDrive\Desktop\Agile_project\backend`)

To power the chatbot securely and save chat history, we will utilize the pre-existing `ChatSession` and `ChatMessage` models in the `chatbot` Django app. We will use the ultra-fast and totally free **Groq API** running the **Llama-3-70b-8192** model.

#### [MODIFY] `backend/requirements.txt`
- Add `groq` to manage API calls to the Groq model.
- Add `python-dotenv` if not already present.

#### [CREATE] `backend/.env`
- Initialize the environment file and explicitly set the provided API key:
  `GROQ_API_KEY=your_groq_api_key_here`

#### [MODIFY] `backend/chatbot/views.py`
- Create a new REST API endpoint (e.g., `ChatbotMessageView`).
- **Logic Sequence**:
  1. Receive `message_content` and optional `course_id` from the request.
  2. Fetch or create an active `ChatSession` for the `request.user`.
  3. Save the incoming message to the `ChatMessage` model with `role='user'`.
  4. Construct the prompt context. If a `course_id` was passed, retrieve the course details to provide context to the Llama-3 model.
  5. Call the `groq.Groq().chat.completions.create(...)` API, using the model `llama3-70b-8192`.
  6. Save the AI's response to the `ChatMessage` model with `role='assistant'`.
  7. Return the response text to the frontend.

#### [MODIFY] `backend/chatbot/urls.py` & `backend/backend/urls.py`
- Register the newly created REST endpoint (e.g., `/api/chatbot/message/`).
- Ensure `chatbot.urls` is included in the main `urls.py`.

---

### 2. Frontend: UI Integration (`c:\Users\saivi\OneDrive\Desktop\Agile_project\frontend`)

The frontend needs a stateful component to chat with the API, and it needs to be injected into the existing learning flows.

#### [NEW] Search GitHub for a Pre-built React Chat Component
- **Critical Agent Instruction:** Before building a UI from scratch, the AI Agent must use its tools to search GitHub or the web for an open-source, beautifully designed React chat widget (e.g., using TailwindCSS or `lucide-react`).
- The agent should clone or copy the raw code for a well-functioning, MIT-licensed chatbot UI and adapt it to our system.

#### [MODIFY] `frontend/src/services/api.js`
- Export a new API definition `chatbotAPI` with functions:
  - `sendMessage(content, courseId)`
  - `getHistory(sessionId)`

#### [NEW] `frontend/src/components/chat/LearningChatbot.js`
- Adapt the React component discovered from GitHub in the previous step.
- **Features**:
  - A chat window array rendering `User` and `AI` messages.
  - An input box with a submit button.
  - Loading states (e.g., typing indicator) while waiting for the Groq API.
  - Clean, modern CSS mimicking the open-source model found.

#### [MODIFY] `frontend/src/pages/CourseDetailPage.js`
- Import and attach the `<LearningChatbot courseId={course.slug} />` component.
- This ensures the chatbot remains visible and accessible while the user is reading course content or watching videos.

---

## Example `task.json` Format for Claude Agent
Since you requested a structure that can be provided to Claude via a `task.json` file, here is the exact payload you can use to instruct the final agent:

```json
{
  "objective": "Implement an AI-powered learning chatbot using the incredibly fast Groq API (Llama-3). The agent MUST search GitHub for a well-functioning React Chatbot UI to integrate into the frontend.",
  "tasks": [
    {
      "id": "1",
      "title": "Backend Setup: Dependencies & Routes",
      "description": "Install 'groq' package. Set the GROQ_API_KEY exactly as: your_groq_api_key_here in .env. Ensure the 'chatbot' app is properly routed in 'backend/urls.py' and create a 'chatbot/urls.py' file.",
      "status": "pending"
    },
    {
      "id": "2",
      "title": "Backend Implementation: Chatbot API View",
      "description": "In 'chatbot/views.py', create an authenticated API view that accepts user text, sends the history to the Groq API (using model: llama3-70b-8192), and saves the Llama-3 response back to the database.",
      "status": "pending"
    },
    {
      "id": "3",
      "title": "GitHub Research: Find React Chat UI",
      "description": "Search GitHub or the web for a well-designed, open-source React chat widget component. Review its code and prepare to adapt it for our 'LearningChatbot.js' component.",
      "status": "pending"
    },
    {
      "id": "4",
      "title": "Frontend Setup: API Services",
      "description": "In 'frontend/src/services/api.js', add endpoints for interacting with the chatbot backend.",
      "status": "pending"
    },
    {
      "id": "5",
      "title": "Frontend Implementation: Chat Widget Component",
      "description": "Create 'LearningChatbot.js' using the open-source code found in Task 3. Connect it to the API endpoints and ensure typing indicators and history work flawlessly.",
      "status": "pending"
    },
    {
      "id": "6",
      "title": "Frontend Integration: Course Page",
      "description": "Inject the LearningChatbot component into 'frontend/src/pages/CourseDetailPage.js'.",
      "status": "pending"
    }
  ]
}
```

---

## Verification Plan
1. **Automated Testing (Backend)**
   - Create tests in `backend/chatbot/tests.py` using `unittest.mock.patch` to mock the Anthropic API call. Ensure the endpoint successfully accepts requests and database records (`ChatSession`, `ChatMessage`) are correctly generated.
2. **Manual Testing**
   - Execute `npm start` and `python manage.py runserver`.
   - Log into a valid student account.
   - Navigate to `/courses/:slug` in the browser.
   - Type a message into the Chatbot widget. Verify that a response arrives successfully and that closing/reopening the page maintains or restarts the session correctly.
