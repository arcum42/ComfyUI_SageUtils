# Architecture Documentation

Technical overview of Sage Utils system design, patterns, and implementation details.

## Table of Contents

1. [System Overview](#system-overview)
2. [Module Structure](#module-structure)
3. [Cross-Tab Messaging](#cross-tab-messaging)
4. [Event System](#event-system)
5. [Performance Optimizations](#performance-optimizations)
6. [Accessibility Architecture](#accessibility-architecture)
7. [State Management](#state-management)
8. [Error Handling](#error-handling)
9. [Testing Strategy](#testing-strategy)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  ComfyUI Frontend                   │
├──────────────┬──────────────┬──────────────────────┤
│  Workflow    │   Sidebar    │    Gallery           │
│   Canvas     │   Tabs       │                      │
│              │              │                      │
│              ├──────────────┤                      │
│              │  LLM Tab     │◄─────────────────────┤
│              │              │  Image Transfer      │
│              ├──────────────┤                      │
│              │Prompt Builder│                      │
│              │              │                      │
└──────────────┴──────┬───────┴──────────────────────┘
                      │
         Cross-Tab Messaging (Event Bus)
                      │
┌─────────────────────┴──────────────────────────────┐
│            Backend API (Python/aiohttp)            │
├────────────────────────────────────────────────────┤
│  LLM Routes  │  Workflow Routes  │  Other Routes  │
└──────┬───────┴───────────────────┴─────────────────┘
       │
┌──────┴─────────────────────────────────────────────┐
│             External LLM Providers                 │
├────────────────────────────────────────────────────┤
│        Ollama          │         LM Studio        │
└────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- Pure JavaScript (ES6+)
- No frameworks (for lightweight integration)
- Native Web APIs (fetch, EventSource, FileReader)
- CSS3 for styling

**Backend**:
- Python 3.9+
- aiohttp (async web framework)
- Server-Sent Events (SSE) for streaming

**Communication**:
- REST API (JSON)
- SSE for real-time streaming
- Custom event bus for cross-tab messaging

---

## Module Structure

### Directory Layout

```
comfyui_sageutils/
├── js/                          # Frontend JavaScript
│   ├── sidebar/                 # Sidebar tab components
│   │   ├── llmTab.js           # LLM chat interface (4317 lines)
│   │   ├── cacheSidebar.js     # Main sidebar container
│   │   └── ...
│   ├── promptBuilder/           # Prompt builder components
│   │   ├── promptGeneration.js # Tag-based prompt UI
│   │   └── ...
│   ├── shared/                  # Shared utilities
│   │   ├── crossTabMessaging.js # Event bus system
│   │   └── performanceUtils.js  # Performance helpers
│   ├── gallery/                 # Gallery integration
│   │   └── galleryEvents.js    # Image transfer logic
│   └── llm/                    # LLM client
│       └── llmApi.js           # API wrapper
├── routes/                      # Backend routes
│   ├── llm_routes.py           # LLM endpoints (842 lines)
│   ├── base.py                 # Route helpers
│   └── ...
├── utils/                       # Backend utilities
│   ├── llm_wrapper.py          # LLM provider abstraction
│   └── settings.py             # Configuration
├── nodes/                       # ComfyUI custom nodes
├── assets/                      # Static assets
│   ├── llm_prompts.json        # Prompt templates
│   └── default_tag_library.json # Prompt builder tags
└── docs/                        # Documentation
```

### Module Dependencies

```
llmTab.js
  ├─ imports llmApi.js (API calls)
  ├─ imports crossTabMessaging.js (events)
  └─ exports createLLMTab()

promptGeneration.js
  ├─ imports crossTabMessaging.js
  └─ exports createPromptGenerationUI()

crossTabMessaging.js
  ├─ imports performanceUtils.js
  └─ exports {
       subscribe(), publish(), 
       sendTextToPromptBuilder(), 
       sendImageToLLM(),
       showNotification()
     }

performanceUtils.js
  └─ exports {
       debounce(), throttle(),
       RateLimiter, BatchProcessor,
       rafThrottle(), memoize(), lazy()
     }
```

### Key Design Principles

1. **Modularity**: Each feature in its own module
2. **Loose Coupling**: Event bus decouples components
3. **Single Responsibility**: Each module has one clear purpose
4. **Progressive Enhancement**: Features work independently
5. **Performance First**: Optimizations built-in from start

---

## Cross-Tab Messaging

### Event Bus Architecture

The `crossTabMessaging.js` module implements a publish-subscribe event bus for cross-component communication.

```javascript
// Architecture
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Publisher   │────────►│   Event Bus      │────────►│ Subscriber   │
│  (Gallery)   │ publish │ (crossTabMsg.js) │subscribe│ (LLM Tab)    │
└──────────────┘         └──────────────────┘         └──────────────┘
```

### Message Types

```javascript
// Image transfer (Gallery → LLM)
{
  type: 'image-transfer', // MessageTypes.IMAGE_TRANSFER
  data: {
    images: [{ base64: '...', filename: '...', metadata: {...} }],
    source: 'gallery',
    autoSwitch: true  // Optional: auto-switch to LLM tab
  }
}

// Text transfer (LLM → Prompt Builder)
{
  type: 'text-to-prompt-builder', // MessageTypes.TEXT_TO_PROMPT_BUILDER
  data: {
    text: 'enhanced prompt...',
    source: 'llm',
    autoSwitch: true,  // Optional: auto-switch to Prompts tab
    append: false      // Optional: append vs replace
  }
}

// Text transfer (Prompt Builder → LLM)
{
  type: 'text-to-llm', // MessageTypes.TEXT_TO_LLM
  data: {
    text: 'prompt to enhance...',
    source: 'prompts',
    autoSwitch: true
  }
}

// Tab switching request
{
  type: 'tab-switch-request', // MessageTypes.TAB_SWITCH_REQUEST
  data: {
    tabId: 'llm' | 'prompts' | 'gallery' | 'models' | 'files' | 'search',
    source: 'user-action',
    metadata: {...}  // Optional context
  }
}

// Tab switched confirmation
{
  type: 'tab-switched', // MessageTypes.TAB_SWITCHED
  data: {
    tabId: 'llm',
    source: 'sidebar'
  }
}

// Notifications
{
  type: 'notification', // MessageTypes.NOTIFICATION
  data: {
    message: 'Image uploaded successfully',
    type: 'success', // 'info' | 'success' | 'warning' | 'error'
    duration: 3000   // Optional: milliseconds
  }
}

// Image queue update
{
  type: 'image-queue-update', // MessageTypes.IMAGE_QUEUE_UPDATE
  data: {
    count: 5,
    source: 'llm'
  }
}

// LLM state request/response
{
  type: 'llm-state-request', // MessageTypes.LLM_STATE_REQUEST
  data: { requestId: 'abc123' }
}
{
  type: 'llm-state-response', // MessageTypes.LLM_STATE_RESPONSE
  data: {
    isGenerating: false,
    model: 'gpt-4o',
    provider: 'openai'
  }
}

// LLM preset applied
{
  type: 'llm-preset-applied', // MessageTypes.LLM_PRESET_APPLIED
  data: {
    presetId: 'creative-writer',
    presetName: 'Creative Writer',
    settings: { temperature: 0.9, ... }
  }
}
```

### Implementation

**Getting Event Bus**:
```javascript
import { getEventBus, MessageTypes } from '../shared/crossTabMessaging.js';

const bus = getEventBus();
```

**Publishing**:
```javascript
import { getEventBus, MessageTypes } from '../shared/crossTabMessaging.js';

const bus = getEventBus();

// Publish with rate limiting
bus.publish(MessageTypes.IMAGE_TRANSFER, {
  images: [{ base64: imageData, filename: 'img.jpg' }],
  source: 'gallery',
  autoSwitch: true
});

// Ignore rate limiting (use sparingly - critical messages only)
bus.publish(MessageTypes.NOTIFICATION, {
  message: 'Critical error occurred',
  type: 'error'
}, { ignoreRateLimit: true });
```

**Helper Functions** (recommended):
```javascript
import { 
  sendImageToLLM, 
  sendTextToPromptBuilder,
  sendTextToLLM,
  requestTabSwitch,
  showNotification 
} from '../shared/crossTabMessaging.js';

// Send image to LLM
await sendImageToLLM(imageBase64, 'photo.jpg', { autoSwitch: true });

// Send text to Prompt Builder
sendTextToPromptBuilder(promptText, { 
  source: 'llm', 
  append: false,
  autoSwitch: true 
});

// Send text to LLM
sendTextToLLM(promptText, { source: 'prompts', autoSwitch: true });

// Request tab switch
requestTabSwitch('llm', { source: 'button-click' });

// Show notification
showNotification('Operation complete', 'success', 3000);
```

**Subscribing**:
```javascript
import { getEventBus, MessageTypes } from '../shared/crossTabMessaging.js';

const bus = getEventBus();

// Subscribe to message type
const unsubscribe = bus.subscribe(MessageTypes.IMAGE_TRANSFER, (message) => {
  console.log('Received:', message.data);
  console.log('Timestamp:', message.timestamp);
  console.log('Type:', message.type);
  
  // Process the images
  const { images, source, autoSwitch } = message.data;
  handleImages(images);
});

// Store unsubscribe for cleanup
state.unsubscribers = state.unsubscribers || [];
state.unsubscribers.push(unsubscribe);

// Later: cleanup
state.unsubscribers.forEach(unsub => unsub());
```

### Rate Limiting

Rate limits prevent message flooding:

```javascript
Rate Limits (per second):
- IMAGE_TRANSFER: 10 messages
- STATE_SYNC: 20 messages
- NOTIFICATION: 5 messages  
- Default (others): No rate limit by default
```

Implementation uses sliding window algorithm in `RateLimiter` class:

```javascript
class RateLimiter {
  constructor(maxCalls, timeWindow) {
    this.maxCalls = maxCalls;      // Max calls allowed
    this.timeWindow = timeWindow;  // Time window in ms
    this.calls = [];               // Timestamp array
  }
  
  allowCall() {
    const now = Date.now();
    // Remove calls outside time window
    this.calls = this.calls.filter(t => now - t < this.timeWindow);
    
    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }
    return false;  // Rate limited
  }
  
  getWaitTime() {
    if (this.calls.length === 0) return 0;
    const oldest = this.calls[0];
    return Math.max(0, this.timeWindow - (Date.now() - oldest));
  }
}
```

**Override Rate Limiting** (use sparingly):
```javascript
bus.publish(messageType, data, { ignoreRateLimit: true });
```

### Available Sidebar Tabs

The sidebar contains multiple tabs that communicate via the event bus:

- **Models Tab** (`'models'`): Browse and manage models/LoRAs with Civitai integration
- **Files Tab** (`'files'`): File browser and management system
- **Civitai Search Tab** (`'search'`): Search and download content from Civitai
- **Image Gallery Tab** (`'gallery'`): View and manage generated images
- **Prompt Builder Tab** (`'prompts'`): Wildcard-based prompt construction with tag library
- **LLM Tab** (`'llm'`): AI chat interface with vision support and conversation history

**Tab IDs** for `requestTabSwitch()`:
- `'models'`, `'files'`, `'search'`, `'gallery'`, `'prompts'`, `'llm'`

---

## Event System

### Event Flow

```
User Action
    │
    ▼
UI Event Handler
    │
    ▼
Business Logic
    │
    ▼
API Call (if needed)
    │
    ▼
Update Local State
    │
    ▼
Publish Event (if cross-tab)
    │
    ▼
Subscribers React
    │
    ▼
Update UI
```

### Event Handler Pattern

**Standard Pattern**:
```javascript
async function handleUserAction(state, ui, data) {
  // 1. Validate input
  if (!validateInput(data)) {
    showError('Invalid input');
    return;
  }
  
  // 2. Update UI (loading state)
  ui.button.disabled = true;
  ui.spinner.style.display = 'block';
  
  try {
    // 3. Business logic / API call
    const result = await performAction(data);
    
    // 4. Update state
    state.lastResult = result;
    
    // 5. Update UI (success)
    ui.output.textContent = result;
    
    // 6. Publish event (if needed)
    publish('ACTION_COMPLETE', { result });
    
    // 7. Show feedback
    showNotification('Action successful', 'success');
    
  } catch (error) {
    // 8. Error handling
    console.error('Action failed:', error);
    showNotification(error.message, 'error');
    
  } finally {
    // 9. Cleanup UI
    ui.button.disabled = false;
    ui.spinner.style.display = 'none';
  }
}
```

### Cleanup Pattern

**Memory Leak Prevention**:
```javascript
function createComponent(container) {
  const state = {
    unsubscribers: [] // Track subscriptions
  };
  
  // Subscribe to events
  const unsub1 = subscribe('EVENT_1', handler1);
  const unsub2 = subscribe('EVENT_2', handler2);
  
  state.unsubscribers.push(unsub1, unsub2);
  
  // Return cleanup function
  return {
    destroy() {
      // Unsubscribe from all events
      state.unsubscribers.forEach(unsub => unsub());
      
      // Clear references
      state.unsubscribers = [];
      
      // Remove DOM listeners
      container.innerHTML = '';
    }
  };
}
```

---

## Performance Optimizations

### Debouncing

Delays execution until input stops:

```javascript
import { debounce } from '../shared/performanceUtils.js';

// Create debounced function (300ms delay)
const debouncedUpdate = debounce((text) => {
  updatePrompt(text);
}, 300);

// Use in input handler
textarea.addEventListener('input', (e) => {
  debouncedUpdate(e.target.value);
  // Only calls updatePrompt 300ms after user stops typing
});
```

**Use Cases**:
- Text input handlers
- Search fields
- Auto-save functionality

### Throttling

Limits execution rate:

```javascript
import { throttle } from '../shared/performanceUtils.js';

// Create throttled function (max once per 1000ms)
const throttledScroll = throttle(() => {
  updateVisibleItems();
}, 1000);

// Use in scroll handler
window.addEventListener('scroll', throttledScroll);
// Only calls updateVisibleItems max once per second
```

**Use Cases**:
- Scroll handlers
- Resize handlers
- Mouse move tracking

### Rate Limiting

Controls message frequency:

```javascript
import { RateLimiter } from '../shared/performanceUtils.js';

// Create rate limiter (10 per second)
const limiter = new RateLimiter(10, 1000);

function sendMessage(data) {
  if (!limiter.checkLimit()) {
    const waitTime = limiter.getWaitTime();
    console.warn(`Rate limited. Wait ${waitTime}ms`);
    return false;
  }
  
  // Send message
  publish('MESSAGE', data);
  return true;
}
```

**Use Cases**:
- API calls
- Event publishing
- Resource-intensive operations

### Batch Processing

Collects items and processes in batches:

```javascript
import { BatchProcessor } from '../shared/performanceUtils.js';

const processor = new BatchProcessor(
  async (items) => {
    // Process batch of items
    await api.processBatch(items);
  },
  { maxSize: 50, maxDelay: 1000 }
);

// Add items individually
processor.add(item1);
processor.add(item2);
// ... automatically processes when:
// - 50 items collected, OR
// - 1000ms elapsed since first item
```

**Use Cases**:
- Bulk API requests
- Database inserts
- Log aggregation

### Request Animation Frame Throttling

Syncs with browser rendering:

```javascript
import { rafThrottle } from '../shared/performanceUtils.js';

const throttledAnimate = rafThrottle(() => {
  updateAnimation();
});

// Call in game loop
function gameLoop() {
  throttledAnimate();
  requestAnimationFrame(gameLoop);
}
```

**Use Cases**:
- Animations
- Visual updates
- Canvas rendering

### Memoization

Caches function results:

```javascript
import { memoize } from '../shared/performanceUtils.js';

const expensiveComputation = memoize((input) => {
  // Complex calculation
  return result;
}, 100); // Cache up to 100 results

// First call: computes
const result1 = expensiveComputation(42);

// Second call with same input: returns cached
const result2 = expensiveComputation(42); // Instant!
```

**Use Cases**:
- Expensive calculations
- Repeated API calls
- Data transformations

---

## Accessibility Architecture

### WCAG 2.1 Level AA Compliance

The system implements comprehensive accessibility:

```
Principles:
├─ Perceivable
│  ├─ ARIA labels on all interactive elements
│  ├─ Live regions for dynamic content
│  └─ Semantic HTML structure
├─ Operable
│  ├─ Full keyboard navigation
│  ├─ Keyboard shortcuts (Ctrl+Enter, Escape)
│  └─ Focus management
├─ Understandable
│  ├─ Clear labels and instructions
│  ├─ Error messages and validation
│  └─ Consistent behavior
└─ Robust
   ├─ Valid HTML/ARIA
   ├─ Screen reader compatible
   └─ Cross-browser support
```

### ARIA Implementation

**Interactive Elements**:
```javascript
// Buttons
button.setAttribute('aria-label', 'Send prompt to LLM');

// Inputs
input.setAttribute('aria-label', 'Prompt text');
input.setAttribute('aria-describedby', 'prompt-help');

// Containers
section.setAttribute('role', 'region');
section.setAttribute('aria-label', 'LLM Response');
```

**Live Regions**:
```javascript
// Dynamic content updates
responseDiv.setAttribute('role', 'log');
responseDiv.setAttribute('aria-live', 'polite');
responseDiv.setAttribute('aria-atomic', 'true');

// Notifications
notificationDiv.setAttribute('role', 'status');
notificationDiv.setAttribute('aria-live', 'assertive');
```

**Keyboard Navigation**:
```javascript
// Tab order
element.setAttribute('tabindex', '0'); // Focusable

// Keyboard shortcuts
textarea.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
  if (e.key === 'Escape') {
    e.target.blur();
  }
});
```

### Screen Reader Support

**Announcements**:
```javascript
function announceToScreenReader(message, priority = 'polite') {
  const liveRegion = document.getElementById('sr-announce');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.textContent = message;
  
  // Clear after announcement
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 1000);
}

// Usage
announceToScreenReader('Image uploaded successfully');
```

---

## State Management

### State Pattern

Each component maintains its own state:

```javascript
function createComponent() {
  // Component state
  const state = {
    // Data
    model: null,
    provider: null,
    generating: false,
    images: [],
    
    // Settings
    settings: {
      temperature: 0.7,
      maxTokens: 2048
    },
    
    // Lifecycle
    unsubscribers: [],
    initialized: false
  };
  
  // State modifiers
  function setState(updates) {
    Object.assign(state, updates);
    render(state);
  }
  
  // Component logic...
  
  return { state, setState, destroy };
}
```

### State Updates

**Immutable Pattern** (for complex objects):
```javascript
// DON'T mutate directly
state.settings.temperature = 0.8; // ❌

// DO create new object
setState({
  settings: {
    ...state.settings,
    temperature: 0.8
  }
}); // ✅
```

**Simple Updates**:
```javascript
// For simple values, direct assignment is fine
state.generating = true;
state.model = 'llama3.2';
```

### State Persistence

**Session Storage**:
```javascript
// Save state
function saveState(key, state) {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

// Load state
function loadState(key, defaultState) {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultState;
  } catch (error) {
    console.error('Failed to load state:', error);
    return defaultState;
  }
}
```

---

## Error Handling

### Error Hierarchy

```
Error Types:
├─ Validation Errors (4xx)
│  ├─ Invalid input
│  ├─ Missing required fields
│  └─ Format errors
├─ Service Errors (5xx)
│  ├─ API failures
│  ├─ Provider unavailable
│  └─ Generation errors
└─ Client Errors
   ├─ Network failures
   ├─ Parse errors
   └─ Unexpected errors
```

### Error Handling Pattern

```javascript
async function apiCall(endpoint, data) {
  try {
    // Make request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    // Parse response
    const json = await response.json();
    
    // Check success
    if (!json.success) {
      // API returned error
      throw new APIError(json.error, response.status);
    }
    
    return json;
    
  } catch (error) {
    // Network error or API error
    if (error instanceof APIError) {
      // Known API error
      handleAPIError(error);
    } else if (error instanceof TypeError) {
      // Network error
      handleNetworkError(error);
    } else {
      // Unexpected error
      handleUnexpectedError(error);
    }
    
    throw error; // Re-throw for caller
  }
}

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}
```

### User-Friendly Errors

```javascript
function getUserFriendlyError(error) {
  // Map technical errors to user-friendly messages
  const errorMap = {
    'ECONNREFUSED': 'Cannot connect to service. Is it running?',
    'Model not found': 'Selected model is not available. Please choose another.',
    'Invalid API key': 'API key is incorrect. Please check your settings.',
    '429': 'Rate limit exceeded. Please wait a moment and try again.'
  };
  
  // Check error patterns
  for (const [pattern, message] of Object.entries(errorMap)) {
    if (error.message.includes(pattern) || error.status?.toString() === pattern) {
      return message;
    }
  }
  
  // Default message
  return 'An error occurred. Please try again.';
}
```

---

## Testing Strategy

### Testing Pyramid

```
        ┌───────────────┐
        │  E2E Tests    │  ← Manual/automated UI tests
        ├───────────────┤
        │ Integration   │  ← API endpoint tests
        ├───────────────┤
        │  Unit Tests   │  ← Function/module tests
        └───────────────┘
```

### Unit Testing

**Example** (using Jest):
```javascript
import { debounce } from '../performanceUtils.js';

describe('debounce', () => {
  jest.useFakeTimers();
  
  it('should delay execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    
    debounced();
    expect(fn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  
  it('should cancel previous call', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    
    debounced();
    debounced();
    debounced();
    
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

**Example** (API endpoint):
```python
import pytest
from aiohttp import web
from routes.llm_routes import register_routes

@pytest.fixture
async def client(aiohttp_client):
    app = web.Application()
    routes = web.RouteTableDef()
    register_routes(routes)
    app.add_routes(routes)
    return await aiohttp_client(app)

async def test_get_models(client):
    resp = await client.get('/sage_llm/models')
    assert resp.status == 200
    
    data = await resp.json()
    assert data['success'] is True
    assert 'models' in data
```

### Manual Testing Checklist

**LLM Tab**:
- [ ] Provider selection works
- [ ] Model loading works
- [ ] Text generation succeeds
- [ ] Vision generation with images works
- [ ] Streaming displays properly
- [ ] Error handling shows messages
- [ ] Keyboard shortcuts work
- [ ] Screen reader announces updates

**Prompt Builder**:
- [ ] Tag selection updates prompt
- [ ] Send to LLM transfers text
- [ ] Receive from LLM updates field
- [ ] Keyboard shortcuts work
- [ ] Validation shows errors

**Cross-Tab**:
- [ ] Gallery to LLM image transfer
- [ ] LLM to Prompt Builder text transfer
- [ ] Notifications appear
- [ ] Rate limiting prevents flooding

---

## Security Considerations

### Input Validation

**Frontend**:
```javascript
function validateImageFile(file) {
  // Check type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { error: 'Unsupported format' };
  }
  
  // Check size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { error: 'File too large' };
  }
  
  return null; // Valid
}
```

**Backend**:
```python
def validate_request_data(data):
    """Validate incoming request data"""
    # Check required fields
    required = ['provider', 'model', 'prompt']
    for field in required:
        if field not in data:
            raise ValueError(f'Missing required field: {field}')
    
    # Validate types
    if not isinstance(data['prompt'], str):
        raise ValueError('Prompt must be a string')
    
    # Validate ranges
    if 'temperature' in data:
        temp = data['temperature']
        if not (0.0 <= temp <= 2.0):
            raise ValueError('Temperature must be 0.0-2.0')
    
    return True
```

### API Key Security

```javascript
// ✅ DO: Store in backend, send via secure headers
const response = await fetch('/sage_llm/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
    // API key handled server-side
  },
  body: JSON.stringify({ provider, model, prompt })
});

// ❌ DON'T: Include API keys in frontend code
const apiKey = 'sk-...'; // Never do this!
```

### Content Security

```javascript
// ✅ DO: Sanitize user input before display
function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html; // Sets as text, not HTML
  return div.innerHTML;
}

responseDiv.textContent = sanitizedResponse; // Safe

// ❌ DON'T: Insert unsanitized content
responseDiv.innerHTML = userInput; // XSS vulnerability!
```

---

## Performance Metrics

### Key Metrics

**Frontend**:
- Time to Interactive (TTI): < 2s
- First Contentful Paint (FCP): < 1s
- Input Latency: < 100ms
- Memory Usage: < 50MB per tab

**Backend**:
- API Response Time: < 100ms (non-LLM)
- LLM First Token: < 500ms
- Throughput: 100 req/s (non-streaming)
- Memory: < 200MB idle

### Monitoring

```javascript
// Performance monitoring
const perfObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance:', entry.name, entry.duration);
  }
});

perfObserver.observe({ entryTypes: ['measure'] });

// Mark key events
performance.mark('generation-start');
await generateText(prompt);
performance.mark('generation-end');
performance.measure('generation', 'generation-start', 'generation-end');
```

---

## Future Enhancements

### Planned Features

1. **Offline Support**: Service workers for caching
2. **WebSocket**: Replace SSE for bidirectional communication
3. **Web Workers**: Offload heavy computation
4. **IndexedDB**: Client-side data persistence
5. **Progressive Web App**: Installable experience

### Scalability Considerations

- **Horizontal Scaling**: Multiple ComfyUI instances
- **Load Balancing**: Distribute LLM requests
- **Caching**: Redis for shared state
- **Queue System**: Background job processing

---

## Related Documentation

- [API Documentation](API.md) - Complete API reference
- [LLM Tab Guide](LLM_TAB_GUIDE.md) - User guide
- [Prompt Builder Guide](PROMPT_BUILDER_GUIDE.md) - Feature guide

---

**Architecture Version**: 1.0  
**Last Updated**: Phase 10 Documentation
