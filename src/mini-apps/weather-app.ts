import {AIProvider} from '../core/ai-provider.js';
import {OpenAIProvider} from '../core/openai-provider.js';
import {DeepseekProvider} from '../core/deepseek-provider.js';
import {GeminiProvider} from '../core/gemini-provider.js'; // Import GeminiProvider
import {askQuestion} from '../core/cli-utils.js';
import {WeatherService, TurnResult} from './weather-service.js';

// Architectural Pattern: CLI Application Layer - Handles user interaction loop and state.

// --- Helper Function to Select Provider ---
function getSelectedProvider(): AIProvider {
	const args = process.argv.slice(2); // Get arguments passed to the script
	const providerArg = args.find(arg => arg.startsWith('--provider='));
	let providerName = 'openai'; // Default provider

	if (providerArg) {
		providerName = providerArg.split('=')[1]?.toLowerCase();
	}

	console.log(`Using AI Provider: ${providerName}`); // Log selected provider

	if (providerName === 'deepseek') {
		return new DeepseekProvider();
	} else if (providerName === 'gemini') {
		return new GeminiProvider();
	} else if (providerName === 'openai') {
		return new OpenAIProvider();
	} else {
		console.warn(`Unknown provider "${providerName}". Defaulting to OpenAI.`);
		return new OpenAIProvider(); // Default fallback
	}
}

// --- Main Application Logic ---
async function main() {
	console.log('--- Conversational Weather App ---');
	console.log("Ask for weather by city, or type '/quit' to exit.");

	// Select and instantiate the provider based on CLI args
	const aiProvider = getSelectedProvider();

	// Instantiate the service, injecting the selected AI provider
	const weatherService = new WeatherService(aiProvider);

	let currentContext: string | null = null; // Holds the weather summary context
	let userInput: string = ''; // Start with empty input to trigger initial AI prompt
	let isFirstTurn = true; // Flag for the initial turn

	while (true) {
		// Use a default prompt for the very first turn if user input is empty
		const inputForAI = isFirstTurn && userInput === '' ? 'Hello' : userInput;
		isFirstTurn = false; // Reset flag after the first turn

		// Handle the conversation turn. Pass null context initially.
		const result: TurnResult = await weatherService.handleConversationTurn(
			inputForAI, // Use the potentially modified input
			currentContext,
		);

		// Display the result from the service
		if (result.type === 'weather') {
			console.log(`\n☀️ ${result.summary}\n`);
			currentContext = result.summary!; // Update context
		} else if (result.text) {
			console.log(`\n🤖 ${result.text}\n`);
			// Update context based on result type
			if (
				result.type === 'question' ||
				result.type === 'info' ||
				result.type === 'error'
			) {
				// Context is lost or wasn't established if AI asks question or gives info/error
				currentContext = null;
			}
			// If type is 'answer', context remains unchanged
		} else {
			console.log('\n🤖 Sorry, something went wrong.\n');
			currentContext = null; // Reset context on unexpected empty result
		}

		// Get the next user input
		userInput = await askQuestion('> ');

		if (userInput.toLowerCase() === '/quit') {
			break; // Exit loop if user types /quit
		}

		if (!userInput.trim()) {
			console.log('Please enter a city or ask a question.');
			userInput = ''; // Set to empty to potentially re-trigger AI prompt if needed
			continue; // Ask again
		}
	}

	console.log('\nExiting Weather App. Goodbye!');
	// rl.close() is handled globally in cli-utils.ts via process.on('exit')
}

// --- Start ---
main().catch(err => {
	console.error('Unhandled error in main:', err);
	// rl.close() will be called by the global exit handler
});
