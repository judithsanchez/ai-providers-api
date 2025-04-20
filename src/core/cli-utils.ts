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

console.log('CLI utilities initialized.');
