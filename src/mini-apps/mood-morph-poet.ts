import {openaiClient} from '../core/openai-client.js'; // Import shared client
import {rl, getMultiLineInput} from '../core/cli-utils.js'; // Import shared CLI utils
import {
	ChatCompletion,
	ChatCompletionCreateParamsBase,
	ChatCompletionTokenLogprob, // Import logprob types
} from 'openai/resources/chat/completions';

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
const TOP_K = 5; // Number of alternative tokens to show

// --- Core API Call ---
async function rewriteText(
	originalText: string,
	mood: string,
): Promise<ChatCompletion | null> {
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
			logprobs: true, // Request log probabilities
			top_logprobs: TOP_K, // Request top K alternative tokens
			max_tokens: 50, // Reduced max_tokens for short input
			temperature: 0.7,
		};
		// Use shared client and assert the non-streaming type
		const completion = (await openaiClient.chat.completions.create(
			config,
		)) as ChatCompletion;
		return completion;
	} catch (error) {
		console.error(
			'Error calling OpenAI API:',
			error instanceof Error ? error.message : String(error),
		);
		return null; // Indicate failure
	}
}

// --- Display Logic ---
function displayResult(completion: ChatCompletion, selectedMood: string): void {
	const rewrittenText = completion.choices[0].message.content;
	// Type the logprobs content array
	const allTokenLogprobs: ChatCompletionTokenLogprob[] | undefined | null =
		completion.choices[0]?.logprobs?.content;

	console.log(`\n--- Rewritten Text (${selectedMood}) ---`);
	console.log(rewrittenText ?? '(No text generated)');
	console.log('-------------------------\n');

	if (allTokenLogprobs && allTokenLogprobs.length > 0) {
		console.log(`--- Token Logprobs (Top ${TOP_K} Alternatives) ---`);
		allTokenLogprobs.forEach((tokenInfo, tokenIndex) => {
			console.log(
				`Token ${tokenIndex + 1}: "${
					tokenInfo.token
				}" (logprob: ${tokenInfo.logprob.toFixed(4)})`,
			);
			// Check if top_logprobs exists and has items
			if (tokenInfo.top_logprobs && tokenInfo.top_logprobs.length > 0) {
				tokenInfo.top_logprobs.forEach((logprobEntry, altIndex) => {
					const probability = Math.exp(logprobEntry.logprob) * 100;
					// Indicate the chosen token (which is tokenInfo.token)
					const chosenMarker =
						logprobEntry.token === tokenInfo.token ? ' (Chosen)' : '';
					console.log(
						`  ${altIndex + 1}. "${logprobEntry.token}" (${probability.toFixed(
							2,
						)}%)${chosenMarker}`,
					);
				});
			} else {
				console.log('  (No alternative logprobs available for this token)');
			}
			console.log(''); // Blank line between tokens
		});
		console.log('-------------------------------------------\n');
	} else {
		console.log('(Logprobs were not available in the response)');
	}
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
