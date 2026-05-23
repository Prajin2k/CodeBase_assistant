import fetch from 'node-fetch';
import getSystemPrompt from './agentPrompts.js';

const askGroq = async ({
  message,
  context,
  agentMode
}) => {

  const systemPrompt =
    getSystemPrompt(agentMode);

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `
USER QUESTION:
${message}

REPOSITORY CONTEXT:
${context}
`
          }
        ],
        temperature: 0.3,
        max_tokens: 1200
      })
    }
  );

  const data = await response.json();

  return (
    data.choices?.[0]?.message?.content ||
    'Unable to analyze repository.'
  );
};

export default askGroq;