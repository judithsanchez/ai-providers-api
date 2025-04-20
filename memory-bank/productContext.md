# Product Context: AI Providers API & Mini-Apps

## Problem Solved

Developers often need to integrate AI capabilities into applications but face challenges with:

- Directly managing different AI provider APIs and their nuances.
- Rapidly prototyping and building small, AI-powered tools without significant boilerplate.
- Ensuring consistency and reusability when using AI across various small projects or features.

This project addresses these issues by providing a standardized way to interact with AI providers and a simple framework for building command-line mini-applications that leverage AI.

## How It Should Work

The system should allow a developer to:

1.  Easily configure and switch between different AI providers (initially focusing on OpenAI).
2.  Develop new mini-apps by focusing on the core logic and AI interaction, leveraging the provided abstractions and utilities.
3.  Run these mini-apps from the command line, providing necessary inputs and receiving AI-generated outputs.

## User Experience Goals

- **Developer Experience:** The core abstractions and mini-app framework should be intuitive and require minimal setup to use and extend.
- **Mini-App Usability:** Each mini-app should have a clear purpose, accept straightforward inputs, and provide useful, AI-driven results via the command line.
- **Clarity:** Interactions with the AI should feel natural within the context of each mini-app's task. For example, in the Weather App, the AI should guide the user through getting weather information and handle related follow-up questions smoothly.
