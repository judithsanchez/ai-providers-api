import readline from 'readline';

export const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

export const askQuestion = (query: string): Promise<string> =>
	new Promise(resolve => rl.question(query, resolve));

export function getMultiLineInput(prompt: string): Promise<string> {
	return new Promise(resolve => {
		const lines: string[] = [];
		console.log(prompt + " (Type 'EOF' on a new line when done):");
		const lineListener = (line: string) => {
			if (line.trim().toUpperCase() === 'EOF') {
				rl.off('line', lineListener);
				resolve(lines.join('\n'));
			} else {
				lines.push(line);
			}
		};
		rl.on('line', lineListener);
	});
}

process.on('SIGINT', () => {
	console.log('\nCaught interrupt signal (Ctrl+C). Exiting.');
	rl.close();
	process.exit();
});

process.on('exit', () => {
	rl.close();
});

/**
 * Simple heuristic to guess if a string contains a city name.
 * Looks for capitalized words, excluding common starting words.
 * This is basic and might need refinement.
 * @param input The user input string.
 * @returns A potential city name string, or null.
 */
export function extractCityNameSimple(input: string): string | null {
	const words = input.trim().split(/\s+/);
	const potentialCities: string[] = [];
	const commonStarts = new Set([
		'what',
		"what's",
		'is',
		'get',
		'fetch',
		'show',
		'me',
	]);

	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		// Check if it starts with a capital letter and is not a common starting word (if it's the first word)
		if (
			word.match(/^[A-Z]/) &&
			(i > 0 || !commonStarts.has(word.toLowerCase()))
		) {
			// Collect consecutive capitalized words
			let currentCity = word;
			let j = i + 1;
			while (j < words.length && words[j].match(/^[A-Z]/)) {
				currentCity += ' ' + words[j];
				j++;
			}
			potentialCities.push(currentCity);
			i = j - 1; // Move index past the collected words
		}
	}

	// Return the longest potential city name found, or null
	if (potentialCities.length > 0) {
		potentialCities.sort((a, b) => b.length - a.length);
		return potentialCities[0];
	}

	return null;
}

console.log('CLI utilities initialized.');
