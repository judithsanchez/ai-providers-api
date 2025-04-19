import OpenAI from 'openai';
import dotenv from 'dotenv';

// Architectural Pattern: Singleton (Conceptual) - Provides a single instance of the configured client.

dotenv.config(); // Load environment variables

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
	console.error('CRITICAL ERROR: OPENAI_API_KEY environment variable not set.');
	process.exit(1); // Exit if key is missing
}

// Initialize and export the single client instance
export const openaiClient = new OpenAI({apiKey});

console.log('OpenAI client initialized.'); // Log initialization
