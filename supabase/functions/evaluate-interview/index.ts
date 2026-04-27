import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company, role, answers } = await req.json();
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "answers array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const transcript = answers.map((a: any, i: number) =>
      `Question ${i + 1}: ${a.question}\nAnswer (${a.duration}s): ${a.answer || "(no answer)"}`
    ).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert interview evaluator. Provide detailed, constructive feedback."
          },
          {
            role: "user",
            content: `Evaluate this mock interview for a ${role} position at ${company}.

${transcript}

Provide a comprehensive evaluation.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_evaluation",
            description: "Return interview evaluation",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "Score out of 100" },
                strengths: { type: "array", items: { type: "string" }, description: "3-5 key strengths" },
                weaknesses: { type: "array", items: { type: "string" }, description: "3-5 areas for improvement" },
                improvements: { type: "array", items: { type: "string" }, description: "5-7 actionable improvement steps" },
                category_scores: {
                  type: "object",
                  properties: {
                    "Technical Knowledge": { type: "number" },
                    "Communication": { type: "number" },
                    "Problem Solving": { type: "number" },
                    "Cultural Fit": { type: "number" },
                    "Confidence": { type: "number" }
                  }
                }
              },
              required: ["overall_score", "strengths", "weaknesses", "improvements", "category_scores"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_evaluation" } }
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : {
      overall_score: 0, strengths: [], weaknesses: [], improvements: [], category_scores: {}
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-interview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
