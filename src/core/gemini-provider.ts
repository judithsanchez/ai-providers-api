import {
	GoogleGenerativeAI,
	Content,
	Part,
	GenerateContentResult,
	GenerateContentStreamResult,
	EnhancedGenerateContentResponse, // Use this for stream chunks
} from '@google/generative-ai';
import {
	ChatCompletionCreateParamsBase,
	ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'; // Keep for config type
import {AIProvider, ChatResponse, ProviderInfo} from './ai-provider.js';
import dotenv from 'dotenv';

dotenv.config();

// Helper to translate OpenAI messages to Gemini Content format
function translateToGeminiMessages(
	messages: ReadonlyArray<ChatCompletionMessageParam>, // Use ReadonlyArray from config type
): Content[] {
	const history: Content[] = [];
	let currentContent: Content | null = null;

	// Filter out system messages if present, as Gemini handles them differently (often via model instructions)
	// Or adjust the role mapping if the Gemini SDK/API supports a system-like role.
	// For now, we'll filter them out and assume the core instruction is part of the model setup or first user message.
	const filteredMessages = messages.filter(msg => msg.role !== 'system');

	for (const message of filteredMessages) {
		// Gemini uses 'model' for assistant role, 'user' for user role.
		const role = message.role === 'assistant' ? 'model' : 'user';
		const text = message.content as string; // Assuming simple text content

		if (!text) continue; // Skip empty messages

		// Gemini API requires alternating user/model roles.
		// If the history is not empty and the current role is the same as the last,
		// we might need to merge or handle this. For simplicity, let's assume
		// the input `messages` mostly adheres to this, but log a warning if not.
		if (history.length > 0 && history[history.length - 1].role === role) {
			console.warn(
				`GeminiProvider: Consecutive messages from the same role ('${role}') detected. Combining content.`,
			);
			const lastContent = history[history.length - 1];
			lastContent.parts[0].text += '\n' + text; // Combine parts
		} else {
			currentContent = {role, parts: [{text}]};
			history.push(currentContent);
		}
	}

	// Ensure the history ends with a 'user' message if it's not empty
	if (history.length > 0 && history[history.length - 1].role !== 'user') {
		// This indicates an issue with the input sequence or filtering logic.
		// Gemini's `startChat` expects history to end before the *final* user message.
		// Let's adjust the logic in the methods using this history.
		console.warn(
			'GeminiProvider: Message history does not end with a user role after filtering. This might cause issues.',
		);
	}

	return history;
}

export class GeminiProvider implements AIProvider {
	private genAI: GoogleGenerativeAI;
	private defaultModelName: string;

	constructor(apiKey?: string, model: string = 'gemini-1.5-flash-latest') {
		// Updated default model
		const key = apiKey ?? process.env.GEMINI_API_KEY;
		if (!key) {
			throw new Error(
				'Gemini API key is missing. Provide it via constructor or GEMINI_API_KEY env variable.',
			);
		}
		this.genAI = new GoogleGenerativeAI(key);
		this.defaultModelName = model;
	}

	getProviderInfo(): ProviderInfo {
		return {
			name: 'Gemini',
			version: '1.0.0', // Placeholder version
			supportedModels: [
				this.defaultModelName, // Now defaults to flash
				'gemini-1.5-flash-latest',
				'gemini-1.5-pro-latest',
				// Add others from the list if desired
			], // Example
		};
	}

	async createChatCompletion(
		config: ChatCompletionCreateParamsBase,
	): Promise<ChatResponse> {
		const startTime = Date.now();
		const targetModel = config.model ?? this.defaultModelName;
		const geminiModel = this.genAI.getGenerativeModel({
			model: targetModel,
			// Pass system prompt if available and supported by the model/SDK version
			// systemInstruction: config.messages.find(m => m.role === 'system')?.content as string | undefined,
		});

		const history = translateToGeminiMessages(config.messages);

		// Separate the history (if any) from the final user message for startChat
		const chatHistory = history.length > 1 ? history.slice(0, -1) : [];
		const lastMessage = history[history.length - 1];

		if (
			!lastMessage ||
			lastMessage.role !== 'user' ||
			!lastMessage.parts[0]?.text
		) {
			throw new Error(
				'GeminiProvider: The final message must be from the user and contain text.',
			);
		}

		// Ensure history provided to startChat alternates and ends with 'model' if not empty
		if (
			chatHistory.length > 0 &&
			chatHistory[chatHistory.length - 1].role !== 'model'
		) {
			// This might happen if the original sequence ended with two user messages.
			// Handle appropriately, e.g., by removing the last user message from history here.
			console.warn(
				'GeminiProvider: Adjusting chat history for startChat requirements.',
			);
			// Potentially trim history further if needed based on API rules
		}

		const chat = geminiModel.startChat({
			history: chatHistory,
			// generationConfig: { // Map relevant config options if needed
			//   temperature: config.temperature ?? undefined,
			//   topP: config.top_p ?? undefined,
			//   maxOutputTokens: config.max_tokens ?? undefined,
			// },
		});

		try {
			const result = await chat.sendMessage(lastMessage.parts[0].text);
			const endTime = Date.now();
			const response = result.response;
			const choice = response.candidates?.[0];
			const messageContent = choice?.content?.parts?.[0]?.text ?? '';

			return {
				content: messageContent,
				metadata: {
					model: targetModel,
					usage: {
						// Gemini API provides token counts in response.usageMetadata
						prompt_tokens: response.usageMetadata?.promptTokenCount,
						completion_tokens: response.usageMetadata?.candidatesTokenCount,
						total_tokens: response.usageMetadata?.totalTokenCount,
					},
					latencyMs: endTime - startTime,
				},
			};
		} catch (error: any) {
			console.error('Gemini API Error:', error);
			// Rethrow or handle specific errors
			throw new Error(`Gemini API request failed: ${error.message}`);
		}
	}

	async *createChatCompletionStream(
		config: ChatCompletionCreateParamsBase,
	): AsyncGenerator<ChatResponse> {
		const startTime = Date.now(); // Track start time for the whole stream
		const targetModel = config.model ?? this.defaultModelName;
		const geminiModel = this.genAI.getGenerativeModel({
			model: targetModel,
			// systemInstruction: config.messages.find(m => m.role === 'system')?.content as string | undefined,
		});

		const history = translateToGeminiMessages(config.messages);
		const chatHistory = history.length > 1 ? history.slice(0, -1) : [];
		const lastMessage = history[history.length - 1];

		if (
			!lastMessage ||
			lastMessage.role !== 'user' ||
			!lastMessage.parts[0]?.text
		) {
			throw new Error(
				'GeminiProvider: The final message must be from the user and contain text for streaming.',
			);
		}

		// Adjust history if needed (similar to non-streaming)
		if (
			chatHistory.length > 0 &&
			chatHistory[chatHistory.length - 1].role !== 'model'
		) {
			console.warn(
				'GeminiProvider: Adjusting chat history for startChat requirements (stream).',
			);
		}

		const chat = geminiModel.startChat({
			history: chatHistory,
			// generationConfig: { ... }, // Map config if needed
		});

		let accumulatedContent = '';
		let finalUsage: any = null; // To store usage from the final aggregated response
		let lastChunkTime = startTime;

		try {
			const resultStream = await chat.sendMessageStream(
				lastMessage.parts[0].text,
			);

			for await (const chunk of resultStream.stream) {
				const chunkTime = Date.now();
				// The stream yields EnhancedGenerateContentResponse chunks
				const choice = chunk.candidates?.[0];
				const deltaContent = choice?.content?.parts?.[0]?.text ?? '';

				if (deltaContent) {
					accumulatedContent += deltaContent;
					yield {
						content: deltaContent, // Yield only the delta for streaming updates
						metadata: {
							model: targetModel,
							// Usage might only be available at the end, latency is per-chunk
							latencyMs: chunkTime - lastChunkTime,
						},
					};
				}
				lastChunkTime = chunkTime;

				// Check for finish reason and potential final usage data in the chunk
				if (choice?.finishReason && choice.finishReason !== 'STOP') {
					console.warn(
						`Gemini stream finished with reason: ${choice.finishReason}`,
					);
				}

				// Aggregate usage if available in chunks (depends on SDK version/response)
				// finalUsage = chunk.usageMetadata ?? finalUsage; // Example if usage is in chunks
			}

			// After the loop, the full response might be available via resultStream.response
			// This often contains the aggregated content and final usage data.
			const finalResponse = await resultStream.response;
			finalUsage = finalResponse?.usageMetadata;
			const finalEndTime = Date.now();

			// Optionally, yield a final "summary" chunk if needed,
			// or rely on the consumer to know the stream ended.
			// The current AIProvider interface expects ChatResponse chunks,
			// so we might need a way to signal the end and provide final metadata.
			// For now, we've yielded content deltas. Let's add a final yield
			// with full content and metadata if the interface implies that.
			// Re-reading interface: AsyncGenerator<ChatResponse>. This implies each yield
			// should be a *complete* ChatResponse. Let's adjust the yield logic.

			// --- Adjusted Stream Logic ---
			// Instead of yielding deltas, we'll yield the *accumulated* content
			// in each chunk, which fits the ChatResponse structure better.

			// Resetting for adjusted logic:
			accumulatedContent = '';
			lastChunkTime = startTime;

			const resultStreamAdjusted = await chat.sendMessageStream(
				lastMessage.parts[0].text,
			);
			for await (const chunk of resultStreamAdjusted.stream) {
				const chunkTime = Date.now();
				const choice = chunk.candidates?.[0];
				const deltaContent = choice?.content?.parts?.[0]?.text ?? '';

				if (deltaContent) {
					accumulatedContent += deltaContent;
					yield {
						content: accumulatedContent, // Yield accumulated content
						metadata: {
							model: targetModel,
							latencyMs: chunkTime - lastChunkTime, // Latency of this chunk generation
						},
					};
				}
				lastChunkTime = chunkTime;
				// Check for finish reason
				if (choice?.finishReason && choice.finishReason !== 'STOP') {
					console.warn(
						`Gemini stream finished with reason: ${choice.finishReason}`,
					);
				}
			}

			// Get final usage after stream ends
			const finalResponseAdjusted = await resultStreamAdjusted.response;
			finalUsage = finalResponseAdjusted?.usageMetadata;
			const finalEndTimeAdjusted = Date.now();

			// Yield a final response with usage data and total latency
			yield {
				content: accumulatedContent, // Final accumulated content
				metadata: {
					model: targetModel,
					usage: {
						prompt_tokens: finalUsage?.promptTokenCount,
						completion_tokens: finalUsage?.candidatesTokenCount,
						total_tokens: finalUsage?.totalTokenCount,
					},
					latencyMs: finalEndTimeAdjusted - startTime, // Total latency for the stream
				},
			};
		} catch (error: any) {
			console.error('Gemini API Stream Error:', error);
			throw new Error(`Gemini API stream request failed: ${error.message}`);
		}
	}
}
