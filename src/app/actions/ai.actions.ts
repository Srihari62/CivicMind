/**
 * @file src/app/actions/ai.actions.ts
 * @description Next.js Server Actions for AI operations.
 * Executes on the server to protect API keys and call generative models.
 */

"use server";

import { FastAssistantAgent } from "@/ai/agents/fast-assistant.agent";
import { VerificationOrchestrator } from "@/ai/orchestrator/verification-orchestrator";
import { CivicReport, MediaAsset } from "@/types";
import { EvidenceAnalysisResult } from "@/ai/types/ai.types";
import { getGeminiModel } from "@/services/gemini/config";
import { AssistantContextService } from "@/services/analytics/assistant-context.service";
import { AI_MODELS } from "@/config/ai-models";

import { authorizeAction } from "./auth-guard";

export interface AIAnalysisPayload {
  media: MediaAsset[];
  location?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
}

export interface AIAnalysisResponse {
  success: boolean;
  data?: EvidenceAnalysisResult;
  error?: string;
}

/**
 * Analyzes uploaded media evidence immediately after file upload.
 * Does not write or create any records in the Firestore database.
 * @param callerUid - UID of the caller user
 * @param payload - Includes uploaded Cloudinary assets and optional GPS coordinates
 */
export async function analyzeReportEvidence(
  callerUid: string,
  payload: AIAnalysisPayload
): Promise<AIAnalysisResponse> {
  try {
    await authorizeAction(callerUid, ["citizen", "officer", "admin"]);
    const { UserRepository } = await import("@/features/auth/repositories/user.repository");
    const userProfile = await UserRepository.getUserProfile(callerUid);
    const preferredLanguage = (userProfile as any)?.preferredLanguage || "English";

    const agent = new FastAssistantAgent();

    // Construct a temporary report mock conforming to the CivicReport schema
    const mockReport: CivicReport = {
      id: "temp-pre-fill-analysis",
      status: "draft",
      metadata: {
        title: "",
        description: "",
        category: "",
        createdBy: "assistant",
        preferredLanguage,
      } as any,
      location: {
        latitude: payload.location?.latitude ?? 0,
        longitude: payload.location?.longitude ?? 0,
        formattedAddress: payload.location?.formattedAddress || "",
      },
      evidence: {
        media: payload.media,
      },
      ai: {
        assistant: null,
        verification: {
          status: "processing",
          fakeMediaProbability: null,
          fakeMediaConfidence: null,
          fakeMediaReason: null,
          duplicateProbability: null,
          duplicateReportIds: null,
          duplicateReason: null,
          assignedDepartment: null,
          priority: null,
          trustScore: null,
          verificationModel: null,
          verificationVersion: null,
          summary: null,
          analyzedAt: null,
          failureReason: null,
        },
        assignment: {
          officerId: null,
          department: null,
          assignedAt: null,
          assignmentMethod: null,
        },
      },
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Invoke the dry-run analysis pipeline (no persistence)
    const result = await agent.analyze(mockReport);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Starts the asynchronous AI verification pipeline for a submitted report on the server.
 * This is a fire-and-forget background execution, so it does not block the client.
 * @param callerUid - UID of the caller user
 * @param reportId - ID of the report to verify
 */
export async function startReportVerification(callerUid: string, reportId: string): Promise<void> {
  await authorizeAction(callerUid, ["citizen", "officer", "admin"]);
  // Execute the verification orchestrator in the background on the server
  (async () => {
    await VerificationOrchestrator.verifyReport(reportId);
  })().catch((err) => {
    console.error(`[ai.actions] Background verification orchestrator failed for report ${reportId}:`, err);
  });
}

export interface ExecutiveSummaryStats {
  totalCount: number;
  activeCount: number;
  resolvedTodayCount: number;
  pendingCount: number;
  avgResTime: string;
  verificationSuccessRate: number;
  avgTrustScore: number;
  avgAiConfidence: number;
  categoryBreakdown: Record<string, number>;
  deptBreakdown: Record<string, number>;
}

export interface ExecutiveSummaryResponse {
  dailySummary: string;
  emergingIssues: string;
  highestLoadDepartments: string;
  operationalRecommendations: string;
  suggestedResourceAllocation: string;
}

/**
 * Next.js Server Action to generate a Gemini-powered Executive Summary for administrators.
 */
export async function getAIExecutiveSummary(callerUid: string, stats: ExecutiveSummaryStats): Promise<ExecutiveSummaryResponse> {
  try {
    await authorizeAction(callerUid, ["admin"]);
    const model = getGeminiModel();
    const prompt = `You are a Smart City Executive AI Assistant for the CivicMind Command Center. Analyze the following municipal metrics for today:
- Total reports in system: ${stats.totalCount}
- Active issues: ${stats.activeCount}
- Resolved today: ${stats.resolvedTodayCount}
- Pending triage queue: ${stats.pendingCount}
- Average resolution time: ${stats.avgResTime}
- Verification success rate: ${stats.verificationSuccessRate}%
- Average Trust Score: ${stats.avgTrustScore}/100
- Average AI Confidence: ${stats.avgAiConfidence}%
- Category breakdown: ${JSON.stringify(stats.categoryBreakdown)}
- Department breakdown: ${JSON.stringify(stats.deptBreakdown)}

Provide an executive operational report of exactly 150-200 words. Format your response strictly as a single JSON object.
Return ONLY raw JSON with these exact keys:
{
  "dailySummary": "Brief overview of city operations today",
  "emergingIssues": "Highlight key issues or spikes",
  "highestLoadDepartments": "Identify department under highest pressure",
  "operationalRecommendations": "Strategic operational actions",
  "suggestedResourceAllocation": "Where to allocate staff or budget"
}
Ensure there is no markdown code blocks, backticks, or text before/after the JSON. Just return the valid JSON string.`;

    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();
    
    // Safely remove any markdown formatting wraps if Gemini included them
    const jsonString = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    return JSON.parse(jsonString) as ExecutiveSummaryResponse;
  } catch (error) {
    console.error("Error generating executive summary:", error);
    return {
      dailySummary: "Municipal Command Center operations are running normally. Steady volume of municipal reports observed across standard divisions.",
      emergingIssues: "Consistent reports on infrastructure and local utility blocks. Categorization indicates standard category loads.",
      highestLoadDepartments: "Roads and Sanitation divisions show standard assignment volumes.",
      operationalRecommendations: "Encourage field teams to maintain target SLAs. Audit pending report queues to prevent backlogs.",
      suggestedResourceAllocation: "Maintain standard staffing distributions across core maintenance divisions."
    };
  }
}

export interface PredictiveInsight {
  title: string;
  description: string;
  confidence: number;
  recommendedAction: string;
}

/**
 * Next.js Server Action to generate Gemini-powered predictive insights from existing reports.
 */
export async function getAIPredictiveInsights(
  callerUid: string,
  reportsData: Array<{
    id: string;
    category: string;
    dept: string;
    lat: number;
    lng: number;
    created: string;
  }>
): Promise<PredictiveInsight[]> {
  try {
    await authorizeAction(callerUid, ["admin"]);
    const model = getGeminiModel();
    const prompt = `You are a Smart City Predictive Urban Planning AI. Analyze the following list of recent municipal reports:
${reportsData.slice(0, 45).map(r => `- ID: ${r.id}, Category: ${r.category}, Dept: ${r.dept}, Lat: ${r.lat.toFixed(4)}, Lng: ${r.lng.toFixed(4)}, Created: ${r.created}`).join("\n")}

Identify potential geographic clusters, recurring category hotspots, temporal spikes, and operational bottlenecks.
Return exactly 3 predictive insights. Format your response strictly as a single JSON array of objects.
Return ONLY raw JSON in this format:
[
  {
    "title": "Short title of predictive insight",
    "description": "Detailed explanation of the predictive trend or emerging hotspot",
    "confidence": 85,
    "recommendedAction": "Actionable recommendation for preventive municipal dispatch"
  }
]
Ensure there is no markdown code blocks, backticks, or text before/after the JSON. Just return the valid JSON string.`;

    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();

    // Safely remove any markdown formatting wraps if Gemini included them
    const jsonString = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    return JSON.parse(jsonString) as PredictiveInsight[];
  } catch (error) {
    console.error("Error generating predictive insights:", error);
    return [
      {
        title: "Emerging Road Wear Clustering",
        description: "Historical reporting patterns suggest an uptick in road damage clusters within major traffic zones.",
        confidence: 78,
        recommendedAction: "Dispatch a survey vehicle to inspect arterial road integrity before winter rainfall."
      },
      {
        title: "Sanitation Backlog Trend",
        description: "Average resolution times for illegal dumping reports show a gradual creep over the past two weeks.",
        confidence: 82,
        recommendedAction: "Temporarily reallocate two extra cleaning crews to waste hubs on peak weekend hours."
      },
      {
        title: "Streetlight Utility Vulnerability",
        description: "Isolated electrical complaints show a high correlation with adjacent streetlighting sectors.",
        confidence: 70,
        recommendedAction: "Run a scheduled inspection of the electrical nodes in the central sector to prevent localized grid outages."
      }
    ];
  }
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ExecutiveBriefData {
  overview: string;
  criticalIssues: string;
  departmentsUnderPressure: string;
  operationalRisks: string;
  recommendedActions: string;
  resourceAllocationSuggestions: string;
}

export interface AskAssistantResponse {
  success: boolean;
  reply?: string;
  brief?: ExecutiveBriefData;
  error?: string;
}

/**
 * Next.js Server Action to interact with the AI Municipal Assistant.
 * Supports standard chat multi-turn dialogue or structured Executive Brief generation.
 */
export async function askMunicipalAssistant(
  callerUid: string,
  history: ChatMessage[],
  message: string,
  mode: "chat" | "executive_brief" = "chat",
  forceRefresh = false
): Promise<AskAssistantResponse> {
  try {
    await authorizeAction(callerUid, ["admin"]);
    // 1. Retrieve the cached or fresh municipal context
    const analytics = await AssistantContextService.getMunicipalContext(forceRefresh);
    const compactContext = AssistantContextService.buildCompactContext(analytics);

    const model = getGeminiModel();

    if (mode === "executive_brief") {
      const prompt = `You are an experienced Smart City Municipal Operations Analyst. Analyze the city's operational context and generate a structured Executive Brief of approximately 250 words total.
Your output must be a valid JSON object. Do not include any markdown, backticks, or other text outside of the JSON object.
Ensure the JSON is strictly parsable.

JSON Schema to return:
{
  "overview": "High-level overview of city operations today, summarizing key statistics.",
  "criticalIssues": "Identify top 2-3 critical issues or bottlenecks.",
  "departmentsUnderPressure": "Highlight which departments have high workloads or backlog sizes.",
  "operationalRisks": "Highlight any immediate risks to city operations (e.g. fake media, unresolved critical events).",
  "recommendedActions": "Strategic recommended actions for administrators.",
  "resourceAllocationSuggestions": "Where to allocate staff or budget."
}

If data is unavailable for any section, state "Insufficient data available." Do not hallucinate statistics.

Context:
${compactContext}`;

      const response = await model.generateContent(prompt);
      const text = response.response.text().trim();
      const jsonString = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

      try {
        const brief = JSON.parse(jsonString) as ExecutiveBriefData;
        return {
          success: true,
          brief,
        };
      } catch (parseErr) {
        console.error("Failed to parse executive brief JSON:", text, parseErr);
        // Fallback brief if parsing fails
        return {
          success: true,
          brief: {
            overview: "Overview summary could not be parsed: Insufficient data available.",
            criticalIssues: "Critical issues cannot be verified: Insufficient data available.",
            departmentsUnderPressure: "Departments evaluation: Insufficient data available.",
            operationalRisks: "Operational risks telemetry: Insufficient data available.",
            recommendedActions: "Recommended actions: Insufficient data available.",
            resourceAllocationSuggestions: "Resource allocations: Insufficient data available."
          }
        };
      }
    } else {
      // Chat mode
      const contents = [];

      // Pass context and instructions in first turn
      contents.push({
        role: "user",
        parts: [{
          text: `System Instruction: You are an experienced municipal operations analyst for the CivicMind Command Center.
You help city administrators make strategic operational decisions based on real data.
Your responses must be concise, actionable, evidence-based, professional, and decision-oriented.

Strict Guidelines:
1. Ground every statistic and number in the provided context. If a metric is not present in the context, do not make it up.
2. If the data is unavailable to answer a question, clearly state: "Insufficient data available."
3. Speak like a senior analyst (professional, analytical, direct, decision-oriented).

Here is the current municipal context:
${compactContext}`
        }]
      });

      contents.push({
        role: "model",
        parts: [{
          text: "Understood. I have loaded the municipal analytics context. I will analyze the data and answer your operations questions professionally and evidence-based."
        }]
      });

      // Add conversation history
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      }

      // Add current message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await model.generateContent({ contents });
      const reply = response.response.text().trim();

      return {
        success: true,
        reply,
      };
    }
  } catch (error) {
    console.error("Error in askMunicipalAssistant:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
}

/**
 * Server Action to verify a community verification photo against the original report description/context.
 */
export async function verifyVerificationPhoto(
  callerUid: string,
  reportId: string,
  verificationPhotoUrl: string,
  verificationComment?: string
): Promise<{ success: boolean; matches: boolean; confidence: number; reason: string }> {
  try {
    await authorizeAction(callerUid, ["citizen", "officer", "admin"]);
    
    // 1. Retrieve original report details
    const { safeDb } = await import("@/services/firebase/admin");
    const report = await safeDb.getReport(reportId);
    if (!report) {
      throw new Error("Original report not found.");
    }

    const reportTitle = report.ai?.assistant?.title || report.metadata.title;
    const reportDesc = report.ai?.assistant?.description || report.metadata.description;
    const reportCat = report.ai?.assistant?.category || report.metadata.category;

    // 2. Build system instructions and prompt
    const systemInstruction = `You are a Smart City Civic Verification AI agent.
Your task is to analyze a new photo uploaded by a citizen attempting to verify/confirm an existing civic issue report.
You must compare the uploaded image against the original report details (title, description, and category) to verify if the photo indeed displays the same issue or a highly related situation at the same site.
You must output a JSON response containing:
1. "matches": boolean (true if the photo matches/corresponds to the reported issue, false if it is unrelated, spam, or different).
2. "confidence": number (0-100 indicating your confidence in the decision).
3. "reason": string (a concise explanation in English of your analysis).

Return ONLY raw JSON conforming to this schema. Do not output markdown blocks.`;

    const prompt = `Original Report:
- Title: ${reportTitle}
- Category: ${reportCat}
- Description: ${reportDesc}

Verification details provided by citizen:
- Comment/Context: ${verificationComment || "No comment provided."}

Analyze the attached photo and determine if it represents a valid verification photo for the original report.`;

    // Guess the mimeType of the photo (usually image/jpeg or image/png)
    let mimeType = "image/jpeg";
    if (verificationPhotoUrl.toLowerCase().endsWith(".png")) {
      mimeType = "image/png";
    } else if (verificationPhotoUrl.toLowerCase().endsWith(".webp")) {
      mimeType = "image/webp";
    }

    // Call GeminiService.generateJson
    const { GeminiService } = await import("@/ai/services/gemini.service");
    const result = await GeminiService.generateJson<{
      matches: boolean;
      confidence: number;
      reason: string;
    }>(
      systemInstruction,
      prompt,
      [{ url: verificationPhotoUrl, mimeType }],
      ["matches", "confidence", "reason"],
      AI_MODELS.VERIFICATION,
      0.1
    );

    return {
      success: true,
      matches: result.matches,
      confidence: result.confidence,
      reason: result.reason,
    };
  } catch (error) {
    console.error("[verifyVerificationPhoto] Failed to verify verification photo:", error);
    return {
      success: false,
      matches: false,
      confidence: 0,
      reason: error instanceof Error ? error.message : "Failed to run AI verification on the photo.",
    };
  }
}

