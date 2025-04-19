# Terminal Mini‑App Ideas for Exploring OpenAI APIs

This document proposes ten bite‑sized, terminal‑only projects—five for the Chat Completions API and five for the newer Responses API.  
Each mini‑app purposefully highlights one or more “dials” you’ll want to experiment with: `max_tokens`, `temperature`, `top_p`, structured outputs, built‑in tools, function calling, and state handling.

---

## 1 Chat Completions API Mini‑Apps

| #   | Title                                  | Core Focus                           | Quick Description                                                                                |
| --- | -------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | **Flashcard Forge**                    | Temperature / Top‑p, structured JSON | Generate Q&A flashcards from a topic; enforce strict JSON output.                                |
| 2   | **Tiny Tale Tuner**                    | `max_tokens`, streaming              | Collaborative one‑sentence story; 20‑token cap per turn; toggle temperature live.                |
| 3   | **Mood‑Morph Poet**                    | Top‑p, `logprobs`                    | Rewrite text in random moods; display top‑k alternative tokens for the first line.               |
| 4   | **JSON Recipe Creator**                | Response‑format enforcement          | Create a recipe JSON (title, ingredients[], steps[], calories); reject/reprompt if format wrong. |
| 5   | **Function‑Calling Weather Dashboard** | Function calling, tool results       | Model must call `getWeather(city, unit)`; you stub the real API and loop back the result.        |

---

## 2 Responses API Mini‑Apps

| #   | Title                                          | Core Focus                                | Quick Description                                                                                     |
| --- | ---------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | **Web‑Scout Researcher**                       | Built‑in `search`, temperature            | Agent auto‑invokes web search; stream semantic events to CLI (“🌐 Searching …”).                      |
| 2   | **File‑Summarizer CLI**                        | `file_search`, conversation state         | Summarize local docs; use `previous_response_id` for follow‑ups without re‑sending files.             |
| 3   | **Terminal Task Automator (“Pseudo‑Dev‑Ops”)** | `computer` tool, top‑p                    | Describe a shell goal; agent plans commands; you print them instead of executing.                     |
| 4   | **Adventure Quest (Event Stream Edition)**     | Event‑driven outputs                      | Text adventure streaming `narration`, `action_options`, `image_prompt`; render with colors/ASCII art. |
| 5   | **Structured Q&A Tutor**                       | `text.format:"markdown"`, token budgeting | Homework helper: short answers first (<100 tokens), longer on “expand”; tweak temperature/top‑p.      |

---

## How to Use This List

1. Pick any idea and implement a minimal CLI (≈50 LOC).
2. Play with sampling controls (`temperature`, `top_p`) and note output variations.
3. Add or raise `max_tokens` limits to witness truncation and concise generation.
4. Experiment with structured outputs (`response_format` in Chat or `text.format` in Responses).
5. Compare manual conversation state (Chat) vs `previous_response_id` (Responses) for multi‑turn flows.

Knock out the first project tonight and you’ll have practical intuition for every major OpenAI API knob. Happy hacking! 🎉
