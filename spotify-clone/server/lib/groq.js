import axios from 'axios';

// Groq's OpenAI-compatible chat API. The key lives server-side only —
// the browser never sees it; clients hit our /api/ai/* endpoints.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export const aiEnabled = () => Boolean(process.env.GROQ_API_KEY);

export const chatCompletion = async (messages, { json = false, maxTokens = 1024, temperature = 0.7 } = {}) => {
  if (!aiEnabled()) {
    const err = new Error('AI features are not configured');
    err.status = 503;
    throw err;
  }

  const { data } = await axios.post(
    GROQ_URL,
    {
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return data.choices?.[0]?.message?.content || '';
};

// Structured helper: ask for JSON, parse defensively (LLMs occasionally wrap
// output in fences even in JSON mode).
export const chatJSON = async (messages, opts = {}) => {
  const raw = await chatCompletion(messages, { ...opts, json: true });
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const err = new Error('AI returned an unreadable response, please retry');
    err.status = 502;
    throw err;
  }
};
