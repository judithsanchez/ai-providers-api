import {openaiClient} from '../core/openai-client.js'; // Import shared client
import {rl, askQuestion} from '../core/cli-utils.js'; // Import shared CLI utils
import {
	ChatCompletionCreateParamsBase,
	ChatCompletion,
} from 'openai/resources/chat/completions';

// --- Constants ---
const MAX_RETRIES = 3;

// --- Type Definitions ---
interface Recipe {
	title: string;
	ingredients: string[];
	steps: string[];
	calories: number;
}

// Define schema structure for clarity and validation
const RECIPE_SCHEMA_INFO = `
Required JSON format:
{
  "title": "string (Recipe title)",
  "ingredients": ["string (Ingredient description)", "..."],
  "steps": ["string (Step description)", "..."],
  "calories": "number (Estimated calories per serving)"
}
`;

// --- Validation Function ---
// Type guard to check if data conforms to Recipe interface
function validateRecipeJson(data: any): data is Recipe {
	if (typeof data !== 'object' || data === null) return false;
	if (typeof data.title !== 'string') return false;
	if (
		!Array.isArray(data.ingredients) ||
		!data.ingredients.every((item: any) => typeof item === 'string')
	)
		return false;
	if (
		!Array.isArray(data.steps) ||
		!data.steps.every((item: any) => typeof item === 'string')
	)
		return false;
	if (typeof data.calories !== 'number') return false;
	return true;
}

// --- Core API Call & Validation Loop ---
async function getRecipeJson(dishName: string): Promise<Recipe | null> {
	let retries = MAX_RETRIES;
	while (retries > 0) {
		console.log(
			`Attempting API call (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`,
		);
		try {
			const config: ChatCompletionCreateParamsBase = {
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: `You are a recipe generator. Respond ONLY with a valid JSON object matching this structure: ${RECIPE_SCHEMA_INFO}. Do not include any introductory text, markdown formatting, or explanations outside the JSON structure.`,
					},
					{
						role: 'user',
						content: `Generate a recipe for ${dishName}.`,
					},
				],
				response_format: {type: 'json_object'},
				temperature: 0.5,
			};

			// Use shared client and assert type
			const completion = (await openaiClient.chat.completions.create(
				config,
			)) as ChatCompletion;

			const responseContent = completion.choices[0].message.content;
			if (!responseContent) {
				console.error(
					`Attempt ${
						MAX_RETRIES - retries + 1
					}: Received empty response content.`,
				);
				retries--;
				if (retries > 0)
					await new Promise(resolve => setTimeout(resolve, 1000));
				continue;
			}

			let parsedJson: any; // Start with 'any' before validation

			// 1. Try parsing the JSON
			try {
				parsedJson = JSON.parse(responseContent);
			} catch (parseError) {
				console.error(
					`Attempt ${MAX_RETRIES - retries + 1}: Failed to parse JSON. Error: ${
						parseError instanceof Error
							? parseError.message
							: String(parseError)
					}`,
				);
				retries--;
				if (retries > 0)
					await new Promise(resolve => setTimeout(resolve, 1000));
				continue;
			}

			// 2. Validate the structure using the type guard
			if (validateRecipeJson(parsedJson)) {
				console.log(
					`Attempt ${
						MAX_RETRIES - retries + 1
					}: Successfully generated and validated JSON.`,
				);
				return parsedJson; // Success! Type is now Recipe
			} else {
				console.error(
					`Attempt ${
						MAX_RETRIES - retries + 1
					}: JSON structure validation failed.`,
				);
				retries--;
				if (retries > 0)
					await new Promise(resolve => setTimeout(resolve, 1000));
				continue;
			}
		} catch (apiError) {
			console.error(
				`Attempt ${MAX_RETRIES - retries + 1}: API call failed. Error: ${
					apiError instanceof Error ? apiError.message : String(apiError)
				}`,
			);
			retries--;
			if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	// If loop finishes without success
	console.error('Max retries reached. Failed to get valid JSON.');
	return null;
}

// --- Main Execution ---
async function main(): Promise<void> {
	console.log('--- JSON Recipe Creator ---');
	try {
		const dishName = await askQuestion(
			'What dish would you like a recipe for? ',
		);

		if (!dishName?.trim()) {
			// Check for empty/whitespace input
			console.log('No dish name provided. Exiting.');
			return;
		}

		console.log(`\nGenerating recipe for "${dishName}"...`);
		const recipeJson = await getRecipeJson(dishName);

		if (recipeJson) {
			console.log('\n--- Generated Recipe JSON ---');
			console.log(JSON.stringify(recipeJson, null, 2));
			console.log('---------------------------\n');
		} else {
			console.log(
				'\nFailed to generate a valid recipe JSON after multiple attempts.',
			);
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
