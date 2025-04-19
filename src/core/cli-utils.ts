import readline from 'readline';

// Architectural Pattern: Utility Module - Provides reusable CLI functions.

// Create and export a single readline interface instance
export const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

// Export a reusable question function
export const askQuestion = (query: string): Promise<string> =>
	new Promise(resolve => rl.question(query, resolve));

// Function to get multi-line input (useful for some apps)
export function getMultiLineInput(prompt: string): Promise<string> {
	return new Promise(resolve => {
		const lines: string[] = [];
		console.log(prompt + " (Type 'EOF' on a new line when done):");
		// Use a temporary listener that removes itself
		const lineListener = (line: string) => {
			if (line.trim().toUpperCase() === 'EOF') {
				rl.off('line', lineListener); // Remove this specific listener
				resolve(lines.join('\n'));
			} else {
				lines.push(line);
			}
		};
		rl.on('line', lineListener);
		// No initial prompt needed here as rl is already active
	});
}

// Ensure readline closes gracefully on exit signals
process.on('SIGINT', () => {
	console.log('\nCaught interrupt signal (Ctrl+C). Exiting.');
	rl.close();
	process.exit();
});

process.on('exit', () => {
	// console.log('Closing readline interface on exit.'); // Optional log
	// Just call close, it's safe to call multiple times or if already closed.
	rl.close();
});

console.log('CLI utilities initialized.'); // Log initialization
