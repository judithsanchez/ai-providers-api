# Active Context: Test AI Providers

## Current Work Focus

Test the newly implemented Gemini provider and verify functionality across all supported providers (OpenAI, DeepSeek, Gemini) within the `weather-app.ts` mini-application.

## Recent Changes

- **DeepSeek Provider:** Added `src/core/deepseek-provider.ts`, implementing the `AIProvider` interface using the OpenAI SDK configured for DeepSeek's compatible API. Updated `.env` with `DEEPSEEK_BASE_URL`.
- **Memory Bank (DeepSeek):** Updated `systemPatterns.md`, `techContext.md`, and `progress.md` to reflect the addition of the DeepSeek provider.
- **Gemini Provider:**
  - Installed `@google/generative-ai` SDK.
  - Created `src/core/gemini-provider.ts`, implementing the `AIProvider` interface (using `ChatResponse`, `ChatCompletionCreateParamsBase`).
  - Handled message translation (OpenAI -> Gemini format) and response translation (Gemini -> `ChatResponse`).
  - Implemented both `createChatCompletion` and `createChatCompletionStream`.
- **Provider Selection (`weather-app.ts`):**
  - Updated `getSelectedProvider` function to recognize `--provider=gemini` and instantiate `GeminiProvider`.
- **Memory Bank (Gemini):** Updated `systemPatterns.md`, `techContext.md`, and `progress.md` to reflect the addition of the Gemini provider and SDK.
- **Previous (DeepSeek):**
  - Added `src/core/deepseek-provider.ts`.
  - Updated `.env` with `DEEPSEEK_BASE_URL`.
  - Updated `weather-app.ts` for DeepSeek selection.
  - Refined `weather-service.ts` prompt and fixed model selection.

## Next Steps

1.  **Testing (`weather-app.ts`):**
    - Run with `--provider=gemini` to verify basic conversational flow and weather fetching.
    - Run with `--provider=deepseek` to confirm the previous prompt refinement fixed the city repetition issue.
    - Run with `--provider=openai` to ensure no regressions.
    - Test both standard and streaming responses if applicable/testable via the app.
2.  **Refinement (Based on Testing):**
    - Adjust `GeminiProvider` message translation or config mapping if issues arise.
    - Further refine `weather-service.ts` system prompt if needed for consistency across providers.
3.  **Apply Provider Selection:** Replicate the provider selection logic (argument parsing and dynamic instantiation) in other mini-apps (`flashcard-forge.ts`, `json-recipe-creator.ts`, etc.).
4.  **Refactor (Optional):** Consider extracting the argument parsing and provider selection logic into a shared utility function (e.g., in `cli-utils.ts` or a new `provider-factory.ts`).
5.  **Implement Missing Features:** Add streaming support to `DeepseekProvider`.

## Active Decisions & Considerations

- Using simple command-line argument parsing (`process.argv`) for provider selection.
- Defaulting to `OpenAIProvider` if the `--provider` argument is missing or invalid.
- Logging the selected provider to the console.
- `GeminiProvider` uses `gemini-pro` by default.
- `AIProvider` interface uses `ChatResponse` for standardized output and `ChatCompletionCreateParamsBase` for input configuration.

## Important Patterns & Preferences

- Adhere to the existing modular structure (Core vs. Mini-Apps).
- Utilize the `AIProvider` abstraction for all AI interactions.
- Use `cli-utils.ts` for user interactions.
- Update Memory Bank files as changes are made and insights are gained.
