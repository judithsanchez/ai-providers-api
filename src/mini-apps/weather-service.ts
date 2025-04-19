import OpenAI from 'openai';
// Removed duplicate import
import {ChatCompletionMessageParam} from 'openai/resources/chat/completions';

// Architectural Pattern: Service Layer - Encapsulates business logic related to weather queries.
// Architectural Pattern: Dependency Injection - OpenAI client is injected via the constructor.

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

export class WeatherService {
	private openai: OpenAI;
	private messages: ChatCompletionMessageParam[] = [];
	// No tools needed anymore for simulation

	constructor(openaiClient: OpenAI) {
		this.openai = openaiClient;
		this.messages = [
			{
				role: 'system',
				content: `You are a helpful weather assistant. Your primary goal is to understand the user's request for weather information and extract the location (city name). Respond ONLY with the extracted city name, nothing else. If the user's input is not about weather or doesn't contain a clear location, respond with "UNKNOWN".`,
			},
		];
		// Tools definition removed
	}

	// Stub function removed

	// --- New methods for Open-Meteo ---

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

	public async processUserQuery(userInput: string): Promise<string> {
		// Don't add user message to this.messages yet, as it's only used for location extraction now.
		// A separate history could be maintained for conversation context if needed later.
		const extractionMessages: ChatCompletionMessageParam[] = [
			...this.messages, // System prompt
			{role: 'user', content: userInput},
		];

		try {
			// --- Step 1: Extract Location using OpenAI ---
			console.log('AI Extracting Location...');
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: extractionMessages,
				temperature: 0, // Low temp for extraction
				// No tools needed here
			});

			const extractedLocation = response.choices[0].message.content?.trim();

			if (!extractedLocation || extractedLocation === 'UNKNOWN') {
				return "Sorry, I couldn't determine the location you're asking about. Please specify a city.";
			}

			console.log(`AI extracted location: ${extractedLocation}`);

			// --- Step 2: Geocode the Location ---
			const geoResult = await this.getCoordinatesForCity(extractedLocation);
			if (!geoResult) {
				return `Sorry, I couldn't find coordinates for "${extractedLocation}". Please check the spelling or try a different city.`;
			}

			// --- Step 3: Get Weather from Open-Meteo ---
			const weatherResult = await this.getWeatherForCoordinates(
				geoResult.latitude,
				geoResult.longitude,
			);
			if (!weatherResult) {
				return `Sorry, I couldn't fetch the current weather data for ${geoResult.name}.`;
			}

			// --- Step 4: Format the Response ---
			const weatherDescription = this.interpretWeatherCode(
				weatherResult.weathercode,
			);
			const formattedResponse = `The current weather in ${
				geoResult.name
			} is ${weatherDescription.toLowerCase()} with a temperature of ${
				weatherResult.temperature
			}°C and wind speed of ${weatherResult.windspeed} km/h.`;

			// Optional: Add the final interaction to a conversation history if needed
			// this.messages.push({ role: 'user', content: userInput });
			// this.messages.push({ role: 'assistant', content: formattedResponse });

			return formattedResponse;
		} catch (error) {
			console.error(
				'\nError during processing:',
				error instanceof Error ? error.message : String(error),
			);
			return 'An error occurred while processing your request.';
		}
	}
}
