// @ts-nocheck

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
};

// Helper to convert Uint8Array to base64 string
function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop(); // gets 'classify', 'diagnose', 'chat', 'health', etc.

  // Simple health check endpoint
  if (path === "health" || url.pathname === "/" || url.pathname === "/functions/v1/proxy") {
    return new Response(
      JSON.stringify({ status: "healthy", time: new Date().toISOString() }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY secret is required" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    // ==========================================
    // 1. CLASSIFY ENDPOINT
    // ==========================================
    if (path === "classify") {
      if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      const formData = await req.formData();
      const imageFile = formData.get("image") as File;
      const cropsList = formData.get("crops") as string;
      const modelType = formData.get("model") as string || "flash";

      if (!imageFile || !cropsList) {
        return new Response("Missing required fields: 'image' and 'crops'", {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Convert to base64
      const imageBytes = new Uint8Array(await imageFile.arrayBuffer());
      const base64Image = arrayBufferToBase64(imageBytes);

      // Model resolution
      let modelName = "gemini-3.1-flash-lite";
      if (modelType === "deep") {
        modelName = Deno.env.get("DEEP_MODEL") || "gemma-4-31b-it";
      } else {
        modelName = Deno.env.get("FLASH_MODEL") || "gemini-3.1-flash-lite";
      }

      const prompt = `You are a high-speed agricultural routing classifier. The user has uploaded an image of a crop leaf.
Identify which crop is in the image. You must choose ONLY from the following list of supported crops:
[${cropsList}]

Respond with ONLY the exact name of the crop from the list. Do not add any punctuation, explanation, introduction, or extra text.`;

      const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

      const response = await fetch(apiURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: imageFile.type || "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error response:", errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const result = await response.json();
      const cleanedResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanedCrop = cleanedResponse.trim().replace(/['"]/g, "");

      // Fuzzy matching logic
      const crops = cropsList.split(",").map((c) => c.trim());
      let matchedCrop = "";
      let matched = false;

      // Try exact case-insensitive match
      for (const c of crops) {
        if (c.toLowerCase() === cleanedCrop.toLowerCase()) {
          matchedCrop = c;
          matched = true;
          break;
        }
      }

      // Try substring match
      if (!matched) {
        for (const c of crops) {
          if (cleanedCrop.toLowerCase().includes(c.toLowerCase())) {
            matchedCrop = c;
            matched = true;
            break;
          }
        }
      }

      // Fallback
      if (!matched) {
        matchedCrop = cleanedCrop;
      }

      return new Response(
        JSON.stringify({ crop: matchedCrop, matched }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // ==========================================
    // 2. DIAGNOSE ENDPOINT (SSE STREAMING)
    // ==========================================
    if (path === "diagnose") {
      if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      const formData = await req.formData();
      const imageFile = formData.get("image") as File;
      const crop = formData.get("crop") as string;
      const contextJSON = formData.get("context") as string;
      const modelType = formData.get("model") as string || "flash";

      if (!imageFile || !crop || !contextJSON) {
        return new Response("Missing required fields: 'image', 'crop', or 'context'", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const imageBytes = new Uint8Array(await imageFile.arrayBuffer());
      const base64Image = arrayBufferToBase64(imageBytes);

      // Model resolution
      let modelName = "gemini-3.1-flash-lite";
      if (modelType === "deep") {
        modelName = Deno.env.get("DEEP_MODEL") || "gemma-4-31b-it";
      } else {
        modelName = Deno.env.get("FLASH_MODEL") || "gemini-3.1-flash-lite";
      }

      const systemInstruction = `You are a Filipino agricultural plant health assistant. The user has uploaded a photo of a ${crop} leaf.
Analyze the image and diagnose its health condition.

You must ground your response ONLY in the following verified database metadata for ${crop}:
${contextJSON}

Respond in this exact format:
- **Crop Identified:** [Local Name] ([Scientific Name])
- **Condition:** [Condition Name — bilingual]
- **Severity:** [Level]
- **Health Score:** [Provide a dynamic estimated health percentage from 0% to 100% based on visual leaf decay and diagnostic severity]%
- **Confidence Score:** [Provide a dynamic confidence score from 0% to 100% indicating how certain you are of this diagnosis based on image clarity, leaf symptom visibility, and similarity to database descriptions]%
- **Symptoms Observed:** [What you see in the image matching the database]
- **Organic Treatment:** [From database]
- **Prevention:** [From database]
- **Care Tip:** [A friendly, localized tip]

Keep your language warm, supportive, and accessible to Filipino farmers.
Mix English and Filipino naturally (Taglish) when appropriate.`;

      const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${geminiApiKey}&alt=sse`;

      const response = await fetch(apiURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "Analyze this crop leaf image according to the system instructions." },
                {
                  inlineData: {
                    mimeType: imageFile.type || "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: { temperature: 0.4 },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error response:", errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6).trim();
                  if (dataStr === "[DONE]") continue;

                  try {
                    const googleJSON = JSON.parse(dataStr);
                    const text = googleJSON.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      const sseData = `data: ${JSON.stringify({ text })}\n\n`;
                      controller.enqueue(encoder.encode(sseData));
                    }
                  } catch (e) {
                    // Ignore partial chunk parse failures
                  }
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            console.error("Error in diagnose stream:", err);
            const sseError = `data: ${JSON.stringify({ error: (err as any).message || "Streaming error" })}\n\n`;
            controller.enqueue(encoder.encode(sseError));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          ...corsHeaders,
        },
      });
    }

    // ==========================================
    // 3. CHAT ENDPOINT (SSE STREAMING)
    // ==========================================
    if (path === "chat") {
      if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      const reqBody = await req.json();
      const { messages, context, model: modelType } = reqBody;

      if (!messages || messages.length === 0 || !context) {
        return new Response("Missing required fields: 'messages' or 'context'", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role !== "user") {
        return new Response("The last message in history must be from the user", {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Model resolution
      let modelName = "gemini-3.1-flash-lite";
      if (modelType === "deep") {
        modelName = Deno.env.get("DEEP_MODEL") || "gemma-4-31b-it";
      } else {
        modelName = Deno.env.get("FLASH_MODEL") || "gemini-3.1-flash-lite";
      }

      const systemInstruction = `You are a friendly Filipino plant care chatbot. The user previously scanned a plant and received a diagnosis.
The user may ask follow-up questions about treatment steps, disease prevention, watering schedules, or general care for this crop.

Use ONLY the following verified crop database as your reference:
${context}

Rules:
- Stay within the scope of the 59 crops in the database.
- If the user asks about a crop or topic not in the database, politely say you can only help with the supported Philippine crops.
- Use warm, encouraging Taglish when appropriate.
- Provide actionable, practical advice suitable for backyard farming.`;

      // Map conversation history directly for REST API
      const contents = messages.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${geminiApiKey}&alt=sse`;

      const response = await fetch(apiURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: { temperature: 0.5 },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error response:", errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6).trim();
                  if (dataStr === "[DONE]") continue;

                  try {
                    const googleJSON = JSON.parse(dataStr);
                    const text = googleJSON.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      const sseData = `data: ${JSON.stringify({ text })}\n\n`;
                      controller.enqueue(encoder.encode(sseData));
                    }
                  } catch (e) {
                    // Ignore partial chunk parse failures
                  }
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            console.error("Error in chat stream:", err);
            const sseError = `data: ${JSON.stringify({ error: (err as any).message || "Streaming error" })}\n\n`;
            controller.enqueue(encoder.encode(sseError));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          ...corsHeaders,
        },
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
