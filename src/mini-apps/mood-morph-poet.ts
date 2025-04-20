import {AIProvider} from '../core/ai-provider.js';
import {openaiClient} from '../core/openai-provider.js'; // Import provider
import {rl, getMultiLineInput} from '../core/cli-utils.js'; // Import shared CLI utils
import {ChatCompletionCreateParamsBase} from 'openai/resources/chat/completions';

// --- Constants ---
const MOODS: string[] = [
	// Type the array
	'happy',
	'sad',
	'angry',
	'excited',
	'mysterious',
	'formal',
	'casual',
	'robotic',
];

// --- Core API Call ---
async function rewriteText(
	originalText: string,
	mood: string,
): Promise<{content: string; metadata: any} | null> {
	// Return type is ChatCompletion or null
	try {
		const config: ChatCompletionCreateParamsBase = {
			model: 'gpt-4o-mini', // Ensure this model supports logprobs
			messages: [
				{
					role: 'system',
					content:
						"You are a Mood-Morph Poet. Rewrite the user's text precisely in the requested mood. Do not add any extra commentary.",
				},
				{
					role: 'user',
					content: `Rewrite the following text in a ${mood} tone (max 5 words input):\n\n${originalText}`,
				},
			],
			top_p: 0.9,
			max_tokens: 50, // Reduced max_tokens for short input
			temperature: 0.7,
		};
		const response = await openaiClient.createChatCompletion(config);
		return {
			content: response.content,
			metadata: response.metadata,
		};
	} catch (error) {
		console.error(
			'Error calling OpenAI API:',
			error instanceof Error ? error.message : String(error),
		);
		return null; // Indicate failure
	}
}

// --- Display Logic ---
function displayResult(
	result: {content: string; metadata: any},
	selectedMood: string,
): void {
	const rewrittenText = result.content;

	console.log(`\n--- Rewritten Text (${selectedMood}) ---`);
	console.log(rewrittenText ?? '(No text generated)');
	console.log('-------------------------\n');
	console.log('Performance Metrics:');
	console.log(`- Model: ${result.metadata.model}`);
	console.log(`- Latency: ${result.metadata.latencyMs}ms`);
	console.log(`- Tokens used: ${result.metadata.usage?.total_tokens ?? 'N/A'}`);
}

// --- Main Execution ---
async function main(): Promise<void> {
	console.log('--- Mood-Morph Poet ---');
	let originalText = '';

	try {
		while (true) {
			// Use the shared multi-line input function
			originalText = await getMultiLineInput(
				'Enter text (max 5 words) to rewrite',
			);

			if (!originalText.trim()) {
				// Check for empty/whitespace input
				console.log('No text provided. Exiting.');
				// rl.close() handled globally
				return;
			}

			// Filter empty strings after split which can happen with multiple spaces
			const wordCount = originalText.trim().split(/\s+/).filter(Boolean).length;

			if (wordCount > 5) {
				console.error(
					'\nInput too long. Please use 5 words or less. Try again.\n',
				);
			} else {
				break; // Valid input length, exit loop
			}
		}

		// Proceed only after valid input is received
		const selectedMood = MOODS[Math.floor(Math.random() * MOODS.length)];
		console.log(`\nChosen mood: ${selectedMood}`);
		console.log('Rewriting text...');

		const completion = await rewriteText(originalText, selectedMood);

		if (completion) {
			displayResult(completion, selectedMood);
		} else {
			console.log('Failed to get rewrite from API.');
		}
	} catch (error) {
		console.error(
			'\nAn error occurred:',
			error instanceof Error ? error.message : String(error),
		);
	} finally {
		// rl.close() is handled globally in cli-utils.ts
	}
}

// --- Start ---
main();
