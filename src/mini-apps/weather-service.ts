import {AIProvider, ChatResponse} from '../core/ai-provider.js';
import {ChatCompletionMessageParam} from 'openai/resources/chat/completions';
import {extractCityNameSimple} from '../core/cli-utils.js'; // Assuming a helper exists or will be added

// Architectural Pattern: Service Layer - Encapsulates weather logic and AI interaction.
// Architectural Pattern: Dependency Injection - AI provider is injected.

// Define interfaces for API responses (basic structure)
interface GeocodeResult {
	latitude: number;
	longitude: number;
	name: string; // City name from geocoding result
}

interface WeatherResult {
	temperature: number;
	weathercode: number; // Open-Meteo uses codes
	windspeed: number;
	// Add other fields as needed based on API parameters
}

// Define the structure for the return value of handleConversationTurn
export interface TurnResult {
	type: 'weather' | 'question' | 'answer' | 'info' | 'error';
	text?: string; // For questions, answers, info, errors
	summary?: string; // For weather results
}

export class WeatherService {
	private aiProvider: AIProvider;
	private systemPrompt: string;

	constructor(aiProvider: AIProvider) {
		this.aiProvider = aiProvider;
		// Updated system prompt for conversational flow - made more explicit for Deepseek
		this.systemPrompt = `You are a friendly weather assistant.
- If the user provides a city name, acknowledge it ONLY with the exact phrase: "Okay, fetching weather for [City Name]...". Do not add any other text or questions in this specific response.
- If the user asks a question AND weather context is provided below, answer the question based ONLY on that context.
- If the user asks a question but NO weather context is provided, or asks something unrelated to the provided context, politely state you need a city first or can only answer about the current weather context.
- If no city is mentioned and no context is provided, ask the user "Which city would you like the weather for?".`;
	}

	// --- Open-Meteo API Methods ---

	private async getCoordinatesForCity(
		cityName: string,
	): Promise<GeocodeResult | null> {
		console.log(`[GeoAPI] Fetching coordinates for: ${cityName}`);
		const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
			cityName,
		)}&count=1&language=en&format=json`;

		try {
			const response = await fetch(geocodeUrl);
			if (!response.ok) {
				throw new Error(`Geocoding API error: ${response.statusText}`);
			}
			const data = (await response.json()) as any; // Assert type as any

			if (data.results && data.results.length > 0) {
				const firstResult = data.results[0];
				const result: GeocodeResult = {
					latitude: firstResult.latitude,
					longitude: firstResult.longitude,
					name: firstResult.name,
				};
				console.log(
					`[GeoAPI] Found: ${result.name} (${result.latitude}, ${result.longitude})`,
				);
				return result;
			} else {
				console.log(`[GeoAPI] No coordinates found for ${cityName}`);
				return null;
			}
		} catch (error) {
			console.error(
				'[GeoAPI] Error fetching coordinates:',
				error instanceof Error ? error.message : String(error),
			);
			return null;
		}
	}

	private async getWeatherForCoordinates(
		lat: number,
		lon: number,
	): Promise<WeatherResult | null> {
		console.log(`[WeatherAPI] Fetching weather for: (${lat}, ${lon})`);
		// Example: Get current temperature, weather code, wind speed
		const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`;

		try {
			const response = await fetch(weatherUrl);
			if (!response.ok) {
				throw new Error(`Weather API error: ${response.statusText}`);
			}
			const data = (await response.json()) as any; // Assert type as any

			if (data.current) {
				const result: WeatherResult = {
					temperature: data.current.temperature_2m,
					weathercode: data.current.weather_code,
					windspeed: data.current.wind_speed_10m,
				};
				console.log(
					`[WeatherAPI] Result: Temp ${result.temperature}°C, Code ${result.weathercode}, Wind ${result.windspeed} km/h`,
				);
				return result;
			} else {
				console.log(
					`[WeatherAPI] No current weather data found for (${lat}, ${lon})`,
				);
				return null;
			}
		} catch (error) {
			console.error(
				'[WeatherAPI] Error fetching weather:',
				error instanceof Error ? error.message : String(error),
			);
			return null;
		}
	}

	// Helper to interpret weather codes (basic example)
	private interpretWeatherCode(code: number): string {
		// Based on WMO Weather interpretation codes
		// See: https://open-meteo.com/en/docs#weathervariables
		if (code === 0) return 'Clear sky';
		if (code === 1) return 'Mainly clear';
		if (code === 2) return 'Partly cloudy';
		if (code === 3) return 'Overcast';
		if (code >= 45 && code <= 48) return 'Fog';
		if (code >= 51 && code <= 55) return 'Drizzle';
		if (code >= 56 && code <= 57) return 'Freezing Drizzle';
		if (code >= 61 && code <= 65) return 'Rain';
		if (code >= 66 && code <= 67) return 'Freezing Rain';
		if (code >= 71 && code <= 75) return 'Snow fall';
		if (code === 77) return 'Snow grains';
		if (code >= 80 && code <= 82) return 'Rain showers';
		if (code >= 85 && code <= 86) return 'Snow showers';
		if (code >= 95 && code <= 99) return 'Thunderstorm'; // Includes slight/moderate/heavy
		return `Unknown (${code})`;
	}

	// --- New Conversational Method ---
	public async handleConversationTurn(
		userInput: string,
		currentContext: string | null,
	): Promise<TurnResult> {
		const messages: ChatCompletionMessageParam[] = [
			{role: 'system', content: this.systemPrompt},
		];

		if (currentContext) {
			messages.push({role: 'system', content: `CONTEXT: ${currentContext}`});
		}
		messages.push({role: 'user', content: userInput});

		try {
			// --- Step 1: Initial AI Call (Intent Check & Response Generation) ---
			console.log('AI Processing turn...');
			// Get the provider's default/preferred model
			const providerInfo = this.aiProvider.getProviderInfo();
			const modelToUse =
				providerInfo.supportedModels[0] || 'default-model-error'; // Fallback needed
			if (modelToUse === 'default-model-error') {
				console.error("Provider doesn't list any supported models!");
				// Handle error appropriately, maybe throw or return error TurnResult
			}

			const aiResponse: ChatResponse =
				await this.aiProvider.createChatCompletion({
					model: modelToUse, // Use the model reported by the provider
					messages: messages,
					temperature: 0.5, // Allow some creativity for conversation
				});
			const aiResponseText = aiResponse.content.trim();
			console.log(`AI Response: ${aiResponseText}`);

			// --- Step 2: Check for City Mention / Fetch Trigger ---
			// Simple check: Does the AI response indicate fetching?
			const fetchTrigger = aiResponseText.startsWith(
				'Okay, fetching weather for',
			);
			// Simple check: Did the user input likely contain a city? (Refine this)
			const potentialCity = extractCityNameSimple(userInput); // Use helper

			let cityToFetch: string | null = null;

			if (fetchTrigger) {
				// Extract city from AI response (more reliable)
				const match = aiResponseText.match(
					/Okay, fetching weather for (.*?)\.\.\./,
				);
				if (match && match[1]) {
					cityToFetch = match[1];
				}
			} else if (potentialCity && !currentContext) {
				// If user likely gave a city and we don't have context yet, assume we should fetch
				cityToFetch = potentialCity;
				console.log(`User likely provided new city: ${cityToFetch}`);
			}

			// --- Step 3: Fetch Weather (If Needed) ---
			if (cityToFetch) {
				console.log(`Fetching weather for: ${cityToFetch}`);
				const geoResult = await this.getCoordinatesForCity(cityToFetch);
				if (!geoResult) {
					return {
						type: 'info',
						text: `Sorry, I couldn't find coordinates for "${cityToFetch}". Please check the spelling or try again.`,
					};
				}

				const weatherResult = await this.getWeatherForCoordinates(
					geoResult.latitude,
					geoResult.longitude,
				);
				if (!weatherResult) {
					return {
						type: 'info',
						text: `Sorry, I couldn't fetch the current weather data for ${geoResult.name}.`,
					};
				}

				const weatherDescription = this.interpretWeatherCode(
					weatherResult.weathercode,
				);
				const formattedSummary = `The current weather in ${
					geoResult.name
				} is ${weatherDescription.toLowerCase()} with a temperature of ${
					weatherResult.temperature
				}°C and wind speed of ${weatherResult.windspeed} km/h.`;

				return {type: 'weather', summary: formattedSummary};
			}

			// --- Step 4: Return AI's Response (Otherwise) ---
			// Determine type based on AI response
			if (aiResponseText.includes('Which city')) {
				return {type: 'question', text: aiResponseText};
			} else if (currentContext && !fetchTrigger) {
				// If we had context and didn't fetch new weather, it's likely an answer
				return {type: 'answer', text: aiResponseText};
			} else {
				// Default to info (includes errors, clarifications)
				return {type: 'info', text: aiResponseText};
			}
		} catch (error) {
			console.error(
				'\nError during conversation turn:',
				error instanceof Error ? error.message : String(error),
			);
			return {
				type: 'error',
				text: 'An error occurred while processing your request.',
			};
		}
	}
}
