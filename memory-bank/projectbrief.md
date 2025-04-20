# Project Brief: AI Providers API & Mini-Apps

## Core Requirements & Goals

This project aims to create a flexible system for interacting with various AI providers (like OpenAI) and building small, focused applications ("mini-apps") that leverage these AI capabilities.

**Key Goals:**

1.  **AI Provider Abstraction:** Develop a core abstraction layer (`src/core/ai-provider.ts`) to allow different AI models and providers to be used interchangeably where possible.
2.  **Mini-App Framework:** Establish a structure and potentially helper utilities (`src/core/cli-utils.ts`?) for easily creating and running command-line based mini-applications.
3.  **Example Mini-Apps:** Build several diverse mini-apps (`src/mini-apps/`) to demonstrate the capabilities of the framework and AI integration. Examples include:
    - Weather App
    - Flashcard Forge
    - JSON Recipe Creator
    - Mood Morph Poet
    - Tiny Tale Tuner
4.  **Maintainability & Extensibility:** Design the system to be easy to understand, maintain, and extend with new AI providers or mini-apps.

## Scope

The initial scope focuses on command-line interaction and leveraging AI for specific, contained tasks within the mini-apps. Future scope might include web interfaces, more complex AI interactions, or different types of applications.

## Source of Truth

This document serves as the foundational understanding of the project's purpose and direction. All other Memory Bank documents should align with this brief.
