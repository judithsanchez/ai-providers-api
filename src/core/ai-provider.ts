import {
	ChatCompletionCreateParamsBase,
	ChatCompletion,
} from 'openai/resources/chat/completions';

export interface ProviderInfo {
	name: string;
	version: string;
	supportedModels: string[];
}

export interface ChatResponse {
	content: string;
	metadata: {
		model: string;
		usage?: {
			prompt_tokens?: number;
			completion_tokens?: number;
			total_tokens?: number;
		};
		latencyMs: number;
	};
}

export interface AIProvider {
	/**
	 * Creates a chat completion using the provider's API
	 * @param config Configuration for the chat completion
	 * @returns Promise resolving to a standardized chat response
	 */
	createChatCompletion(
		config: ChatCompletionCreateParamsBase,
	): Promise<ChatResponse>;

	/**
	 * Creates a streaming chat completion
	 * @param config Configuration for the chat completion
	 * @returns Async generator of chat response chunks
	 */
	createChatCompletionStream(
		config: ChatCompletionCreateParamsBase,
	): AsyncGenerator<ChatResponse>;

	/**
	 * Gets information about the provider implementation
	 * @returns Provider metadata including name and supported models
	 */
	getProviderInfo(): ProviderInfo;
}
