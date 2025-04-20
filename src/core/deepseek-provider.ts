import OpenAI from 'openai';
import {AIProvider, ChatResponse, ProviderInfo} from './ai-provider.js';
import {ChatCompletionCreateParamsBase} from 'openai/resources/chat/completions';

// Load environment variables
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL;

if (!DEEPSEEK_API_KEY) {
	throw new Error('DEEPSEEK_API_KEY environment variable is not set.');
}
if (!DEEPSEEK_BASE_URL) {
	throw new Error('DEEPSEEK_BASE_URL environment variable is not set.');
}

/**
 * An implementation of AIProvider that uses the DeepSeek API
 * via the OpenAI-compatible endpoint.
 */
export class DeepseekProvider implements AIProvider {
	private client: OpenAI;
	private providerName = 'Deepseek';
	private defaultModel = 'deepseek-chat'; // Default model for Deepseek
	private supportedModels = ['deepseek-chat', 'deepseek-reasoner']; // Add others if known

	constructor() {
		this.client = new OpenAI({
			apiKey: DEEPSEEK_API_KEY,
			baseURL: DEEPSEEK_BASE_URL,
		});
	}

	async createChatCompletion(
		config: ChatCompletionCreateParamsBase,
	): Promise<ChatResponse> {
		const startTime = Date.now();
		const targetModel = config.model || this.defaultModel;

		// Ensure the model is supported (optional, but good practice)
		if (!this.supportedModels.includes(targetModel)) {
			console.warn(
				`Model ${targetModel} might not be supported by DeepseekProvider. Using it anyway.`,
			);
		}

		try {
			// Use the config object directly, but override model if necessary and ensure no streaming
			const completion = (await this.client.chat.completions.create({
				...config,
				model: targetModel,
				stream: false, // Explicitly ask for non-streaming response
			})) as OpenAI.Chat.Completions.ChatCompletion; // Cast to the non-streaming type

			const endTime = Date.now();
			const responseContent = completion.choices[0]?.message?.content;

			if (responseContent === null || responseContent === undefined) {
				throw new Error('DeepSeek API returned an empty message content.');
			}

			return {
				content: responseContent,
				metadata: {
					model: completion.model, // Use the model returned by the API
					usage: completion.usage
						? {
								prompt_tokens: completion.usage.prompt_tokens,
								completion_tokens: completion.usage.completion_tokens,
								total_tokens: completion.usage.total_tokens,
						  }
						: undefined,
					latencyMs: endTime - startTime,
				},
			};
		} catch (error: any) {
			console.error('Error calling DeepSeek API:', error);
			throw new Error(`DeepSeek API request failed: ${error.message}`);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async *createChatCompletionStream(
		config: ChatCompletionCreateParamsBase,
	): AsyncGenerator<ChatResponse> {
		// TODO: Implement streaming logic if Deepseek/OpenAI SDK supports it easily
		// For now, throw an error or return a single response based on non-streaming
		console.warn(
			'Streaming not yet implemented for DeepseekProvider. Falling back to non-streaming.',
		);
		const response = await this.createChatCompletion(config);
		yield response;
		// Alternatively: throw new Error('Streaming not implemented for DeepseekProvider');
	}

	getProviderInfo(): ProviderInfo {
		return {
			name: this.providerName,
			version: 'v1', // Or fetch dynamically if possible
			supportedModels: this.supportedModels,
		};
	}
}
