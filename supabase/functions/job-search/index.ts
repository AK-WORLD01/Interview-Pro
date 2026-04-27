import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company, location, role } = await req.json();
    if (!company || !location || !role) {
      return new Response(JSON.stringify({ error: "company, location, and role are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: "You are a job search assistant. Return ONLY valid JSON. No markdown, no code blocks."
          },
          {
            role: "user",
            content: `Search for real, current job openings matching:
Company: ${company}
Location: ${location}
Role: ${role}

Return a JSON object with a "jobs" array containing 5-8 realistic job listings. Each job must have:
- title (string): specific job title
- company (string): the company name
- location (string): city/state or remote
- salary_range (string): realistic salary range like "$120K-$160K"
- description (string): 2-3 sentence description
- requirements (array of strings): 4-6 key requirements/skills
- posted_date (string): realistic recent date like "2 days ago"
- apply_url (string): realistic URL to company careers page

Base results on real-world data about this company, their actual tech stack, typical roles, and current market salaries. Make it realistic and specific.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_jobs",
            description: "Return job search results",
            parameters: {
              type: "object",
              properties: {
                jobs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      company: { type: "string" },
                      location: { type: "string" },
                      salary_range: { type: "string" },
                      description: { type: "string" },
                      requirements: { type: "array", items: { type: "string" } },
                      posted_date: { type: "string" },
                      apply_url: { type: "string" }
                    },
                    required: ["title", "company", "location", "salary_range", "description", "requirements", "posted_date", "apply_url"]
                  }
                }
              },
              required: ["jobs"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_jobs" } }
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { jobs: [] };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("job-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
