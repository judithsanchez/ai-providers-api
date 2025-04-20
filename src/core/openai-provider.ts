import OpenAI from 'openai';
import dotenv from 'dotenv';
import {AIProvider, ProviderInfo, ChatResponse} from './ai-provider.js';

dotenv.config();

export class OpenAIProvider implements AIProvider {
	private client: OpenAI;

	constructor() {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('OPENAI_API_KEY environment variable not set');
		}
		this.client = new OpenAI({apiKey});
	}

	async createChatCompletion(
		config: OpenAI.ChatCompletionCreateParams,
	): Promise<ChatResponse> {
		const startTime = Date.now();
		// Explicitly assert the type to ChatCompletion as we are not streaming here
		const completion = (await this.client.chat.completions.create(
			config,
		)) as OpenAI.ChatCompletion;
		const endTime = Date.now();

		return {
			content: completion.choices[0]?.message?.content || '',
			metadata: {
				model: completion.model,
				usage: completion.usage,
				latencyMs: endTime - startTime,
			},
		};
	}

	async *createChatCompletionStream(
		config: OpenAI.ChatCompletionCreateParams,
	): AsyncGenerator<ChatResponse> {
		const startTime = Date.now();
		const stream = await this.client.chat.completions.create({
			...config,
			stream: true,
		});

		for await (const chunk of stream) {
			yield {
				content: chunk.choices[0]?.delta?.content || '',
				metadata: {
					model: chunk.model,
					latencyMs: Date.now() - startTime,
				},
			};
		}
	}

	getProviderInfo(): ProviderInfo {
		return {
			name: 'OpenAI',
			version: '1.0.0',
			supportedModels: ['gpt-4', 'gpt-3.5-turbo'],
		};
	}
}

// Maintain backwards compatibility with existing imports
export const openaiClient = new OpenAIProvider();
