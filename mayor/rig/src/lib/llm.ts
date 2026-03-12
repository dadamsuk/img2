import { getConfig } from "./config";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  const key = getConfig().openrouter.apiKey;
  if (!key || key === "your-openrouter-api-key-here") {
    throw new Error("openrouter.apiKey not configured in config.json");
  }
  return key;
}

function getModel(): string {
  return getConfig().openrouter.defaultModel;
}

interface EvalResult {
  match: boolean;
  reasoning: string;
}

export async function evaluateAnswer(
  fieldType: string,
  setterAnswer: string,
  guesserAnswer: string
): Promise<EvalResult> {
  const apiKey = getApiKey();

  const systemPrompt = `You are a quiz answer evaluator. Compare the guesser's answer to the setter's answer.
Be reasonably lenient: accept synonyms, abbreviations, minor spelling variations, and equivalent answers.
For "where" fields: accept equivalent location names (e.g., "NYC" = "New York City").
For "when" fields: accept equivalent date formats and reasonable approximations.
For "who" fields: accept first name only if unambiguous, nicknames, etc.
For "what" fields: accept equivalent descriptions of the same thing.

Respond with JSON only: {"match": true/false, "reasoning": "brief explanation"}`;

  const userPrompt = `Field type: ${fieldType}
Setter's answer: ${setterAnswer}
Guesser's answer: ${guesserAnswer}

Is the guesser's answer correct?`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from LLM");

  return JSON.parse(content) as EvalResult;
}

export async function generateClues(
  imageBase64: string,
  mimeType: string
): Promise<string[]> {
  const apiKey = getApiKey();

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: `You are helping create clues for a photo guessing game. Given a photo, generate 5 text clues that progressively reveal more about the image. Start vague, end specific. Each clue should be one sentence. Respond with JSON: {"clues": ["clue1", "clue2", "clue3", "clue4", "clue5"]}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            { type: "text", text: "Generate 5 progressive clues for this photo." },
          ],
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from LLM");

  const parsed = JSON.parse(content);
  return parsed.clues as string[];
}
