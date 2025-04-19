import {openaiClient} from '../core/openai-client.js'; // Import shared client
import {rl, askQuestion} from '../core/cli-utils.js'; // Import shared CLI utils
import {
	ChatCompletionMessageParam,
	ChatCompletionChunk,
} from 'openai/resources/chat/completions';
import {Stream} from 'openai/streaming';

// --- State ---
let currentTemperature: number = 0.7;
// Type the messages array
const messages: ChatCompletionMessageParam[] = [
	{
		role: 'system',
		content:
			'You are a collaborative storyteller. Continue the story with one short sentence, strictly under 20 tokens. Do not add any preamble like "Okay, here\'s the next sentence:". Just provide the sentence.',
	},
];

// --- Input Handling ---
async function handleUserInput(input: string): Promise<boolean> {
	// Return boolean to indicate if loop should continue
	const trimmedInput = input.trim();

	if (trimmedInput.toLowerCase() === '/quit') {
		return false; // Signal to stop the loop
	}

	if (trimmedInput.startsWith('/temp')) {
		const parts = trimmedInput.split(' ');
		if (parts.length === 2) {
			const tempValue = parseFloat(parts[1]);
			if (!isNaN(tempValue) && tempValue >= 0.0 && tempValue <= 2.0) {
				currentTemperature = tempValue;
				console.log(`Temperature set to ${currentTemperature}`);
			} else {
				console.log(
					'Invalid temperature value. Use a number between 0.0 and 2.0.',
				);
			}
		} else {
			console.log('Usage: /temp [0.0-2.0]');
		}
		return true; // Continue loop after handling command
	}

	if (trimmedInput) {
		messages.push({role: 'user', content: trimmedInput});
		await getAIResponse(); // Get AI response only if user provided story input
	} else {
		console.log('Please enter a sentence or a command.'); // Prompt if input is empty
	}
	return true; // Continue loop
}

// --- AI Response Generation (Streaming) ---
async function getAIResponse(): Promise<void> {
	process.stdout.write('AI: ');
	let aiSentence = '';
	try {
		// Use the shared client for streaming
		const stream: Stream<ChatCompletionChunk> =
			await openaiClient.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: messages, // Pass the typed array
				temperature: currentTemperature,
				max_tokens: 20, // Strict token limit
				stream: true,
			});

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content || '';
			process.stdout.write(content);
			aiSentence += content;
		}
		process.stdout.write('\n'); // Newline after streaming is complete

		// Add the complete AI sentence to messages only if it's not empty
		if (aiSentence.trim()) {
			messages.push({role: 'assistant', content: aiSentence.trim()});
		} else {
			console.warn('[Warning: AI generated an empty response]');
		}
	} catch (error) {
		console.error(
			'\nError calling OpenAI API:',
			error instanceof Error ? error.message : String(error),
		);
		// Optionally remove the last user message if AI fails? Depends on desired behavior.
	}
}

// --- Main Execution ---
async function main(): Promise<void> {
	console.log('--- Tiny Tale Tuner ---');
	console.log("Let's write a story together, one sentence at a time!");
	console.log("The AI's sentences are capped at 20 tokens.");
	console.log(
		'Commands: /temp [0.0-2.0] to change creativity, /quit to exit.\n',
	);

	let keepGoing = true;
	while (keepGoing) {
		const userInput = await askQuestion('You: '); // Use shared askQuestion
		keepGoing = await handleUserInput(userInput);
	}

	console.log('\nStory ended. Goodbye!');
	// rl.close() is handled globally in cli-utils.ts
}

// --- Start ---
main().catch(error => {
	console.error(
		'Unhandled error in main:',
		error instanceof Error ? error.message : String(error),
	);
	// rl.close() will be handled by the global exit handler
});
