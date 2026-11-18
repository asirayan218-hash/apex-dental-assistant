exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);
    const openAIKey = process.env.OPENROUTER_API_KEY;

    if (!openAIKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "OPENROUTER_API_KEY is missing in Netlify Environment Variables!" }) };
    }

    // 4 VIP Models fallback list
    const models = [
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "mistralai/mistral-small-24b-instruct-2501",
      "google/gemini-flash-1.5"
    ];

    let reply = null;
    let lastError = "All models failed";

    for (const model of models) {
      try {
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "You are a professional, helpful dental receptionist at Apex Dental Clinic in Karachi. Keep replies short, friendly, and match user language (Roman Urdu/English)." },
              ...history.slice(-4),
              { role: "user", content: message }
            ]
          })
        });

        const data = await openRouterRes.json();
        if (openRouterRes.ok && data.choices?.[0]?.message?.content) {
          reply = data.choices[0].message.content;
          break; // Kaam ho gaya, loop break
        } else {
          lastError = data.error?.message || `Model ${model} failed`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!reply) throw new Error(lastError);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
