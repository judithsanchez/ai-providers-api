// Note: dotenv is initialized in openai-client.ts
import {openaiClient} from '../core/openai-client.js'; // Import shared client
import {rl, askQuestion} from '../core/cli-utils.js'; // Import shared CLI utils
import {WeatherService} from './weather-service.js'; // Import the service

// Architectural Pattern: CLI Application Layer - Handles user interaction and orchestrates service calls.

// --- Main Application Logic ---
async function main() {
	console.log('--- Real Weather App (Open-Meteo) ---');

	// Instantiate the service, injecting the SHARED OpenAI client
	const weatherService = new WeatherService(openaiClient);

	let cityInput = ''; // Initialize cityInput

	while (true) {
		// Ask for city only if it's not provided from the previous iteration's follow-up prompt
		if (!cityInput) {
			cityInput = await askQuestion('\nEnter city name (or /quit): ');
		}

		if (cityInput.toLowerCase() === '/quit') {
			break; // Exit loop if user types /quit
		}

		if (!cityInput.trim()) {
			console.log('Please enter a city name.');
			cityInput = ''; // Reset cityInput to ask again
			continue; // Ask again if input is empty
		}

		// Delegate processing to the service using the city name directly
		console.log(`Fetching weather for ${cityInput}...`); // Add feedback
		const weatherResult = await weatherService.processUserQuery(cityInput);

		// Display the final result from the service
		console.log('\nWeather Result:', weatherResult);

		// Ask for next action (follow-up city or quit)
		const nextAction = await askQuestion(
			'\nEnter another city name, or type /quit: ',
		);
		if (nextAction.toLowerCase() === '/quit') {
			break; // Exit loop if user types /quit
		} else {
			cityInput = nextAction; // Use this input as the city for the next iteration
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
