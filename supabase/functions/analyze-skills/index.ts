import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, manualSkills, targetRole, targetCompany } = await req.json();

    if (!resumeText && (!manualSkills || manualSkills.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Either resume text or manual skills are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analyze the following candidate profile for a ${targetRole || "Software Engineer"} position${targetCompany ? ` at ${targetCompany}` : ""}.

${resumeText ? `RESUME TEXT:\n${resumeText}\n` : ""}
${manualSkills?.length ? `MANUALLY PROVIDED SKILLS: ${manualSkills.join(", ")}\n` : ""}

Perform a comprehensive skills gap analysis.`;

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
            content:
              "You are an expert career coach and technical recruiter. Analyze resumes and skills with precision. Provide actionable, specific feedback.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return comprehensive skills gap analysis",
              parameters: {
                type: "object",
                properties: {
                  extracted_skills: {
                    type: "object",
                    properties: {
                      technical: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            level: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
                          },
                          required: ["name", "level"],
                        },
                      },
                      soft_skills: { type: "array", items: { type: "string" } },
                      tools: { type: "array", items: { type: "string" } },
                      frameworks: { type: "array", items: { type: "string" } },
                    },
                    required: ["technical", "soft_skills", "tools", "frameworks"],
                  },
                  match_percentage: {
                    type: "number",
                    description: "Overall skill match percentage 0-100",
                  },
                  missing_skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        reason: { type: "string" },
                      },
                      required: ["name", "priority", "reason"],
                    },
                  },
                  outdated_skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        replacement: { type: "string" },
                      },
                      required: ["name", "replacement"],
                    },
                  },
                  resume_suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific resume improvement suggestions",
                  },
                  learning_roadmap: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        timeline: { type: "string" },
                        resources: { type: "string" },
                      },
                      required: ["skill", "timeline", "resources"],
                    },
                  },
                  interview_readiness: {
                    type: "number",
                    description: "Interview readiness score 0-100",
                  },
                  weak_sections: {
                    type: "array",
                    items: { type: "string" },
                    description: "Vague or weak resume sections",
                  },
                },
                required: [
                  "extracted_skills",
                  "match_percentage",
                  "missing_skills",
                  "outdated_skills",
                  "resume_suggestions",
                  "learning_roadmap",
                  "interview_readiness",
                  "weak_sections",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall
      ? JSON.parse(toolCall.function.arguments)
      : { error: "Failed to parse analysis" };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-skills error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
