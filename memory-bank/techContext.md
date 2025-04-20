# Tech Context: AI Providers API & Mini-Apps

## Core Technologies

- **Language:** TypeScript (inferred from `.ts` files and `tsconfig.json`)
- **Runtime:** Node.js (inferred from `package.json`, `package-lock.json`, and typical TypeScript backend usage)
- **Package Manager:** npm (inferred from `package.json` and `package-lock.json`)
- **AI Providers:**
  - OpenAI (via `openai-provider.ts`, using `openai` SDK)
  - DeepSeek (via `deepseek-provider.ts`, using `openai` SDK configured for DeepSeek's compatible API)
  - Google Gemini (via `gemini-provider.ts`, using `@google/generative-ai` SDK)

## Development Setup

- **Build/Compilation:** TypeScript Compiler (`tsc`), configured via `tsconfig.json`.
- **Dependencies:** Managed via `package.json` and `npm`. Key dependencies include:
  - `openai`: Used by `OpenAIProvider` and `DeepseekProvider`.
  - `@google/generative-ai`: Used by `GeminiProvider`.
  - `dotenv`: For managing environment variables (API keys).
  - Potentially others for specific mini-apps (e.g., `fetch` built-in for weather).

## Technical Constraints

- Primarily designed for command-line interface (CLI) interaction.
- Relies on external APIs (OpenAI, DeepSeek, Gemini, Open-Meteo Weather API). Network connectivity and API key management are necessary.

## Tool Usage Patterns

- Core logic is written in TypeScript.
- npm is used for installing dependencies and potentially running scripts defined in `package.json`.
- Git is likely used for version control (inferred from `.gitignore`).
