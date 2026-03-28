import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../../.env'), override: true });

/**
 * Call the Lava API gateway with a system prompt and user message.
 * Returns the response text string.
 * Throws on failure so callers can fall back to direct Anthropic.
 */
export async function callLava(systemPrompt, userMessage) {
  const response = await axios.post(
    'https://gateway.lavaprotocol.org/v1/chat/completions',
    {
      model: 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: 1000,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LAVA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.choices[0].message.content;
}
