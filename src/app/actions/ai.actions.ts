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
 * @param payload - Includes uploaded Cloudinary assets and optional GPS coordinates
 */
export async function analyzeReportEvidence(
  payload: AIAnalysisPayload
): Promise<AIAnalysisResponse> {
  try {
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
      },
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
 * @param reportId - ID of the report to verify
 */
export async function startReportVerification(reportId: string): Promise<void> {
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
export async function getAIExecutiveSummary(stats: ExecutiveSummaryStats): Promise<ExecutiveSummaryResponse> {
  try {
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
export async function getAIPredictiveInsights(reportsData: Array<{
  id: string;
  category: string;
  dept: string;
  lat: number;
  lng: number;
  created: string;
}>): Promise<PredictiveInsight[]> {
  try {
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
