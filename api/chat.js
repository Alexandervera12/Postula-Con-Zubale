export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const { messages, temperature = 0.3, max_tokens = 800 } = req.body;

    const contents = [];
    let systemText = "";

    for (const m of messages) {
      if (m.role === "system") {
        systemText = m.content;
        continue;
      }
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }

    if (contents.length > 0 && systemText) {
      contents[0].parts[0].text = systemText + "\n\n---\n\n" + contents[0].parts[0].text;
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: systemText || "Hola" }] });
    }

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: max_tokens,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(response.status || 500).json({ error: data.error });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta.";

    return res.status(200).json({
      choices: [{ message: { role: "assistant", content: text } }],
    });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
