# System Patterns: AI Providers API & Mini-Apps

## Architecture Overview

The system appears to follow a modular architecture:

```mermaid
theme dark
%% Default color palette for diagrams (dark theme)
%% Customize using CSS variables where supported
%% Suggested Colors:
%% Background: #1e1e1e
%% Node Fill: #2d2d30
%% Node Border: #3c3c3c
%% Text: #d4d4d4
%% Accent: #569cd6 (blue), #ce9178 (orange), #4ec9b0 (green)
graph TD
    subgraph Core System ["src/core"]
        AIP[AIProvider Interface<br/>(ai-provider.ts)]
        CLI[CLI Utilities<br/>(cli-utils.ts)]
        OpenAIClientLib[OpenAI SDK Library]
        GoogleAIClientLib[Google AI SDK<br/>(@google/generative-ai)]
        OpenAIProvider[OpenAI Provider Impl<br/>(openai-provider.ts)]
        DeepseekProvider[Deepseek Provider Impl<br/>(deepseek-provider.ts)]
        GeminiProvider[Gemini Provider Impl<br/>(gemini-provider.ts)]

        AIP --> OpenAIProvider
        AIP --> DeepseekProvider
        AIP --> GeminiProvider
        OpenAIProvider -- Uses --> OpenAIClientLib
        DeepseekProvider -- Uses --> OpenAIClientLib
        GeminiProvider -- Uses --> GoogleAIClientLib
        %% Note: openai-client.ts might be deprecated or unused if OpenAIProvider uses the SDK directly
    end

    subgraph Mini Applications ["src/mini-apps"]
        WeatherApp[Weather App (Conversational)<br/>(weather-app.ts)]
        WeatherSvc[Weather Service (Handles Turns)<br/>(weather-service.ts)]
        Flashcard[Flashcard Forge<br/>(flashcard-forge.ts)]
        Recipe[JSON Recipe Creator<br/>(json-recipe-creator.ts)]
        Poet[Mood Morph Poet<br/>(mood-morph-poet.ts)]
        Tuner[Tiny Tale Tuner<br/>(tiny-tale-tuner.ts)]
        OtherApps[...]

        WeatherApp --> WeatherSvc
        WeatherApp --> AIP
        Flashcard --> AIP
        Recipe --> AIP
        Poet --> AIP
        Tuner --> AIP
        OtherApps --> AIP

        WeatherApp --> CLI
        Flashcard --> CLI
        Recipe --> CLI
        Poet --> CLI
        Tuner --> CLI
        OtherApps --> CLI
    end

    style Core System fill:#2d2d30,stroke:#3c3c3c,color:#d4d4d4
    style Mini Applications fill:#2d2d30,stroke:#3c3c3c,color:#d4d4d4
```

**Key Components:**

1.  **Core (`src/core`):**

    - `ai-provider.ts`: Defines a common interface (`AIProvider`) for interacting with different AI models, returning a standardized `ChatResponse`. Includes `createChatCompletion`, `createChatCompletionStream`, and `getProviderInfo`.
    - `openai-provider.ts`: An implementation of `AIProvider` specifically for OpenAI, using the `openai` SDK library.
    - `deepseek-provider.ts`: An implementation of `AIProvider` for DeepSeek, leveraging its OpenAI API compatibility via the `openai` SDK library configured with DeepSeek's endpoint and API key.
    - `gemini-provider.ts`: An implementation of `AIProvider` for Google Gemini, using the `@google/generative-ai` SDK library.
    - `openai-client.ts`: Handles direct communication with the OpenAI API. _(Note: This seems deprecated or unused now that providers use SDKs directly)._
    - `cli-utils.ts`: Provides helper functions for CLI interaction (e.g., `askQuestion`).

2.  **Mini-Apps (`src/mini-apps`):**
    - Each `.ts` file represents a distinct application.
    - Apps utilize the `AIProvider` interface (often via a service layer) for AI capabilities.
    - Apps use `cli-utils.ts` for user interaction.
    - Service modules (e.g., `weather-service.ts`) encapsulate business logic, external API calls (like Open-Meteo), and detailed AI interaction/prompting.
    - `weather-app.ts` now manages a conversational loop, passing user input and context strings to `weather-service.ts`.
    - `weather-service.ts` uses AI prompts with injected context to handle conversation turns and decide actions.

## Design Patterns

- **Strategy Pattern:** The `AIProvider` interface and its implementations (`OpenAIProvider`, `DeepseekProvider`, `GeminiProvider`) allow switching the underlying AI service without changing the mini-apps that use it.
- **Dependency Injection:** Services (`WeatherService`) and applications (`weather-app.ts`) receive dependencies like `AIProvider` via constructor or factory function (`getSelectedProvider`).
- **Service Layer:** `weather-service.ts` encapsulates external API calls (Open-Meteo) and complex AI prompting/interaction logic, separating it from the main app loop (`weather-app.ts`).
- **State Management (Simplified):** `weather-app.ts` manages the high-level conversation state (the current weather context string), passing it to the service layer each turn.
- **Modularity:** Separation into `core` and `mini-apps` remains.

## Critical Implementation Paths

- **Conversational Turn (Weather App):**
  1.  `weather-app.ts` gets user input via `askQuestion`.
  2.  Calls `weatherService.handleConversationTurn`, passing input and the current context string.
  3.  Receives a `TurnResult` (weather, question, answer, info, error).
  4.  Displays the result text/summary.
  5.  Updates or clears the context string based on `TurnResult.type`.
  6.  Loops.
- **AI Interaction (Weather Service):**
  1.  `handleConversationTurn` receives input and context string.
  2.  Constructs messages for `createChatCompletion` (system prompt, optional context message, user message).
  3.  Calls AI provider.
  4.  Analyzes AI response and user input to decide action (fetch weather or return AI text).
  5.  If fetching: Calls Open-Meteo helpers (`getCoordinatesForCity`, `getWeatherForCoordinates`).
  6.  Formats and returns `TurnResult`.
- **External Service Integration:** `weather-service.ts` directly calls Open-Meteo APIs via `fetch`.
