# Progress: AI Providers API & Mini-Apps

## Current Status

- **Memory Bank:** Core documentation files updated (`systemPatterns.md`, `techContext.md`). `progress.md` and `activeContext.md` are being updated now.
- **Core System:**
  - `AIProvider` interface defined in `ai-provider.ts` (using `ChatResponse`).
  - `OpenAIProvider` implementation exists.
  - `DeepseekProvider` implementation exists.
  - `GeminiProvider` implementation added (`gemini-provider.ts`), using `@google/generative-ai` SDK.
  - `cli-utils.ts` updated previously.
- **Mini-Apps:**
  - `weather-app.ts` updated to allow provider selection (OpenAI, DeepSeek, Gemini) via `--provider` command-line argument.
  - `weather-service.ts`:
    - Fixed model selection to use provider's reported model (via `getProviderInfo`).
    - Refined system prompt for potentially better DeepSeek behavior.
    - Refactored previously for conversational flow.
  - Other mini-apps exist.

## What Works

- Project structure established.
- AI provider abstraction (`AIProvider`) allows for multiple implementations (OpenAI, DeepSeek, Gemini).
- `DeepseekProvider` successfully created.
- `GeminiProvider` successfully created, implementing the `AIProvider` interface using the `@google/generative-ai` SDK.
- Provider selection mechanism updated in `weather-app.ts` to include Gemini.
- `weather-service.ts` correctly uses the model specified by the selected provider (via `getProviderInfo`).
- `weather-app.ts` conversational loop (from previous task):
  - AI proactively asks for city if needed.
  - Fetches weather via Open-Meteo through the service.
  - Handles follow-up questions based on provided context string.
- `weather-service.ts` uses AI completions with context injection to manage conversation turns (with refined prompt).

## What's Left to Build / Current Task

- **Testing:**
  - Test `weather-app.ts` with `--provider=gemini` to ensure basic functionality.
  - Test `weather-app.ts` with `--provider=deepseek` (verify prompt refinement fix).
  - Test `weather-app.ts` with `--provider=openai` (ensure no regressions).
- **Provider Selection:**
  - Apply provider selection logic to other mini-apps as needed.
- **DeepSeek Provider:**
  - Implement streaming support in `DeepseekProvider` (`createChatCompletionStream`). _(Note: The interface uses `AsyncGenerator<ChatResponse>`, not OpenAI's `ChatCompletionChunk`)._
- **Gemini Provider:**
  - Refine message translation (`translateToGeminiMessages`) if needed based on testing (e.g., handling system prompts, consecutive roles).
  - Map more generation config options (temperature, max tokens etc.) from `ChatCompletionCreateParamsBase` if required.
- **Testing & Refinement (Weather App - General):**
  - Thoroughly test the `weather-app.ts` conversational flow with all three providers (OpenAI, DeepSeek, Gemini).
  - Evaluate and potentially improve the `extractCityNameSimple` heuristic.
  - Further refine AI system prompts in `weather-service.ts` if needed based on testing across providers.
- **General:**
  - Add comprehensive error handling.
  - Consider extracting provider selection logic into a shared utility.
  - Refine other existing mini-apps or add new ones.
  - Implement unit/integration tests.

## Known Issues

- City name extraction (`extractCityNameSimple`) is a simple heuristic and may fail on complex inputs.
- AI responses might occasionally misinterpret context or user intent, requiring prompt refinement (especially observed with DeepSeek initially).

## Evolution of Project Decisions

- **Initial:** Project started with OpenAI focus and basic mini-apps.
- **Weather App Refactor:** Decided to use Open-Meteo and add conversational AI.
- **Simplification (Weather App):** Adopted a simpler conversational approach passing context as a string between the app and service, relying heavily on the AI prompt engineering within the service layer.
- **DeepSeek Integration:** Added `DeepseekProvider` leveraging OpenAI API compatibility via the official SDK.
- **Provider Selection:** Implemented command-line argument (`--provider`) parsing in `weather-app.ts` to dynamically select and instantiate the AI provider (OpenAI, DeepSeek).
- **Model Handling:** Corrected `weather-service.ts` to request the model specified by the provider's `getProviderInfo` instead of hardcoding one.
- **Prompt Engineering:** Refined the `weather-service.ts` system prompt to improve behavior consistency across different providers (specifically targeting DeepSeek repetition).
- **Gemini Integration:** Added `GeminiProvider` using the `@google/generative-ai` SDK and updated `weather-app.ts` provider selection. Corrected `GeminiProvider` implementation to match the `AIProvider` interface (`ChatResponse`, `ChatCompletionCreateParamsBase`).
