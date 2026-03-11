import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { EXERCISES } from "./exercises.js";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

router.post("/ai/detect-weight", async (req, res) => {
  try {
    const { imageBase64, unit = "lbs" } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: `You are a gym weight detection AI. Look at this image and identify the weight shown on dumbbells, barbells, plates, or weight stacks.

CRITICAL: Return ONLY valid JSON with NO explanation, NO markdown, NO code blocks. Just raw JSON.

Return exactly:
{"detected":true,"weightKg":22.7,"confidence":"high","description":"25 lb dumbbell"}

Or if no weight detected:
{"detected":false,"weightKg":null,"confidence":null,"description":null}

Weight detection rules:
- If you see numbers on weights/dumbbells, use those numbers
- If the label is in lbs, convert to kg (divide by 2.2046)
- If the label is in kg, use that directly
- Common dumbbell weights: 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50 lbs
- Common weight plates: 2.5, 5, 10, 25, 35, 45 lbs
- Confidence: "high" if numbers clearly visible, "medium" if estimated, "low" if uncertain`,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch {
      result = { detected: false, weightKg: null, confidence: null, description: null };
    }

    const weightLbs = result.weightKg ? result.weightKg * 2.2046 : null;
    
    res.json({
      detected: result.detected ?? false,
      weightKg: result.weightKg ?? null,
      weightLbs: weightLbs ? Math.round(weightLbs * 10) / 10 : null,
      confidence: result.confidence ?? null,
      description: result.description ?? null,
    });
  } catch (error) {
    console.error("Weight detection error:", error);
    res.status(500).json({ error: "Failed to detect weight" });
  }
});

router.post("/ai/detect-exercise", async (req, res) => {
  try {
    const { imageBase64, context } = req.body;

    const exerciseList = EXERCISES.map(e => `${e.id}: ${e.name} (${e.category}, ${e.equipment})`).join("\n");

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a gym exercise recognition AI. Given an image or context, identify which exercise is being performed.
        
Available exercises:
${exerciseList}

Return ONLY valid JSON with NO explanation, NO markdown, NO code blocks. Just raw JSON.

If exercise detected: {"detected":true,"exerciseId":"bicep-curl","exerciseName":"Bicep Curl","confidence":"high"}
If not detected: {"detected":false,"exerciseId":null,"exerciseName":null,"confidence":null}`,
      },
    ];

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];
    
    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`,
          detail: "high",
        },
      });
    }
    
    userContent.push({
      type: "text",
      text: context ? `Context: ${context}. Identify the exercise.` : "Identify the exercise being performed.",
    });

    messages.push({ role: "user", content: userContent });

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 200,
      messages,
    });

    const content = response.choices[0]?.message?.content ?? "";
    
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch {
      result = { detected: false, exerciseId: null, exerciseName: null, confidence: null };
    }

    res.json({
      detected: result.detected ?? false,
      exerciseId: result.exerciseId ?? null,
      exerciseName: result.exerciseName ?? null,
      confidence: result.confidence ?? null,
    });
  } catch (error) {
    console.error("Exercise detection error:", error);
    res.status(500).json({ error: "Failed to detect exercise" });
  }
});

export default router;
