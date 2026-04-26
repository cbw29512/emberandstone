// scripts/lib/anthropic-client.mjs
// Purpose: Call the Anthropic Messages API for script generation.
// Why: Keeping API code isolated makes it easier to swap providers later.

export async function callAnthropicMessage(config, payload) {
  try {
    const response = await fetch(config.anthropicEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: payload.maxTokens,
        system: payload.system,
        messages: [
          {
            role: "user",
            content: payload.prompt
          }
        ]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error("Anthropic API failed with HTTP " + response.status + ": " + responseText.slice(0, 500));
    }

    const parsed = JSON.parse(responseText);
    const textBlocks = Array.isArray(parsed.content) ? parsed.content : [];
    const joinedText = textBlocks
      .filter((block) => block && block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!joinedText.trim()) {
      throw new Error("Anthropic response did not contain text output.");
    }

    return {
      raw: parsed,
      text: joinedText
    };
  } catch (error) {
    throw new Error("Anthropic call failed: " + error.message);
  }
}
