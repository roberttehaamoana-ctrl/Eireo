import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let knowledge = null;
try {
  const raw = await readFile(join(__dirname, 'knowledge.json'), 'utf-8');
  knowledge = JSON.parse(raw);
} catch(e) {
  console.error('Erreur knowledge.json:', e.message);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;

    let systemPrompt = '';
    if (knowledge) {
      if (knowledge.regles) systemPrompt += knowledge.regles + '\n\n';
      if (knowledge.lexique) systemPrompt += '## LEXIQUE (priorité absolue)\n' + knowledge.lexique + '\n\n';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
