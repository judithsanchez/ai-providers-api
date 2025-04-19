import {openaiClient} from '../core/openai-client.js'; // Import shared client
import {rl, askQuestion} from '../core/cli-utils.js'; // Import shared CLI utils
import {
	ChatCompletionCreateParamsBase,
	ChatCompletion, // Import the specific type
} from 'openai/resources/chat/completions';

// --- Type Definitions ---
type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type Style = 'formal' | 'casual';

interface Flashcard {
	id: string;
	question: string;
	answer: string;
}

interface Metadata {
	difficulty_level: Difficulty;
	total_cards: number;
	topic: string;
}

interface FlashcardResponse {
	flashcards: Flashcard[];
	metadata: Metadata;
	performance: {
		latency_ms: number;
		input_tokens: number | undefined; // Usage might be undefined
		output_tokens: number | undefined;
		total_tokens: number | undefined;
		model: string;
	};
}

// --- Core Logic ---
async function generateFlashcards(
	topic: string,
	difficulty: Difficulty,
	numCards: number,
	style: Style,
): Promise<FlashcardResponse> {
	const config: ChatCompletionCreateParamsBase = {
		model: 'gpt-4o-mini', // Updated model
		messages: [
			{
				role: 'system',
				content: `You are a professional educator and flashcard creator. Create clear, concise questions with accurate and educational answers. Maintain consistent difficulty level.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format. Ensure all strings within the JSON are properly escaped (e.g., use \\" for quotes, \\n for newlines).
{
  "flashcards": [
    {
      "id": "1",
      "question": "Clear, concise question",
      "answer": "Educational, accurate answer"
    }
    // ... more cards
  ],
  "metadata": {
    "difficulty_level": "beginner|intermediate|advanced",
    "total_cards": ${numCards},
    "topic": "${topic}"
  }
}`,
			},
			{
				role: 'user',
				content: `Create ${numCards} flashcards about ${topic}. Difficulty level: ${difficulty}, Style: ${style}`,
			},
		],
		temperature: 0.3,
		top_p: 0.8,
		max_tokens: 400, // Increased slightly
		response_format: {type: 'json_object'},
		seed: 123, // For reproducibility
		// stream: false, // Removing this as it didn't resolve the type issue
	};

	const startTime = Date.now();
	// Use the imported shared client and assert the non-streaming type
	const completion = (await openaiClient.chat.completions.create(
		config,
	)) as ChatCompletion; // Use the imported type for assertion
	const endTime = Date.now();
	const rawResponse = completion.choices[0].message.content;

	if (!rawResponse) {
		throw new Error('Received empty response content from OpenAI.');
	}

	let parsedResponse: {flashcards: Flashcard[]; metadata: Metadata};
	try {
		// Explicitly type the expected structure for parsing
		parsedResponse = JSON.parse(rawResponse) as {
			flashcards: Flashcard[];
			metadata: Metadata;
		};
		// Basic validation
		if (!parsedResponse.flashcards || !parsedResponse.metadata) {
			throw new Error(
				"Parsed JSON is missing required 'flashcards' or 'metadata' fields.",
			);
		}
	} catch (parseError) {
		console.error('Failed to parse JSON response from OpenAI.');
		console.error('Raw response:', rawResponse);
		throw new Error(
			`JSON Parsing Error: ${
				parseError instanceof Error ? parseError.message : String(parseError)
			}`,
		);
	}

	return {
		flashcards: parsedResponse.flashcards,
		metadata: parsedResponse.metadata,
		performance: {
			latency_ms: Math.round(endTime - startTime),
			input_tokens: completion.usage?.prompt_tokens, // Use optional chaining
			output_tokens: completion.usage?.completion_tokens,
			total_tokens: completion.usage?.total_tokens,
			model: completion.model,
		},
	};
}

// --- Main Execution ---
async function main() {
	console.log('--- Flashcard Forge ---');
	try {
		const topic = await askQuestion('Enter topic: ');
		const difficultyInput = await askQuestion(
			'Difficulty (1=Beginner, 2=Intermediate, 3=Advanced): ',
		);
		const numCardsInput = await askQuestion('Number of cards (1-5): ');
		const styleInput = await askQuestion('Style (formal/casual): ');

		const difficultyMap: Record<string, Difficulty> = {
			'1': 'beginner',
			'2': 'intermediate',
			'3': 'advanced',
		};
		const difficulty: Difficulty =
			difficultyMap[difficultyInput] || 'intermediate';
		const numCards: number = Math.min(
			Math.max(Number(numCardsInput) || 1, 1),
			5,
		); // Ensure number between 1 and 5
		const style: Style =
			styleInput.toLowerCase() === 'casual' ? 'casual' : 'formal'; // Default to formal

		console.log('\nGenerating flashcards...\n');

		const result = await generateFlashcards(topic, difficulty, numCards, style);

		console.log(`Topic: ${result.metadata.topic}`); // Use metadata topic
		console.log(`Cards Generated: ${result.flashcards.length}`);
		console.log(`Difficulty: ${result.metadata.difficulty_level}`);
		console.log(`Style: ${style}\n`);

		result.flashcards.forEach((card, i) => {
			console.log(`${i + 1}. Q: ${card.question}`);
			console.log(`   A: ${card.answer}\n`);
		});

		console.log('--- Performance ---');
		console.log(`- Latency: ${result.performance.latency_ms}ms`);
		console.log(`- Input tokens: ${result.performance.input_tokens ?? 'N/A'}`);
		console.log(
			`- Output tokens: ${result.performance.output_tokens ?? 'N/A'}`,
		);
		console.log(`- Total tokens: ${result.performance.total_tokens ?? 'N/A'}`);
		console.log(`- Model: ${result.performance.model}`);
		console.log('-------------------\n');
	} catch (error) {
		console.error(
			'Error:',
			error instanceof Error ? error.message : String(error),
		);
	} finally {
		// rl.close() is handled globally in cli-utils.ts
	}
}

main();
