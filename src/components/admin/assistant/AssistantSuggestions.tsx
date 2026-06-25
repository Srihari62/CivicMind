/**
 * @file src/components/admin/assistant/AssistantSuggestions.tsx
 * @description Suggestions and Predefined Quick Actions for the AI Assistant dashboard.
 */

import React from "react";
import { 
  FileText, 
  Activity, 
  Users, 
  AlertTriangle, 
  Layers, 
  MapPin, 
  TrendingUp,
  HelpCircle
} from "lucide-react";

interface AssistantSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const AssistantSuggestions: React.FC<AssistantSuggestionsProps> = ({ onSelectPrompt }) => {
  // Predefined quick actions matching the requirements
  const quickActions = [
    {
      label: "Today's Summary",
      icon: <FileText className="w-3.5 h-3.5 text-blue-400" />,
      prompt: "Summarize today's incidents, triage results, and city overview.",
    },
    {
      label: "Department Health",
      icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />,
      prompt: "Which department has the highest workload and what are their scorecard metrics?",
    },
    {
      label: "Officer Leaderboard",
      icon: <Users className="w-3.5 h-3.5 text-purple-400" />,
      prompt: "Which officers are handling the most cases and who has resolved the most incidents?",
    },
    {
      label: "Critical Incidents",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
      prompt: "Show high priority unresolved reports needing immediate administrative action.",
    },
    {
      label: "Pending Backlog",
      icon: <Layers className="w-3.5 h-3.5 text-amber-400" />,
      prompt: "What is the backlog size across departments and how many reports are pending assignment?",
    },
    {
      label: "Emerging Hotspots",
      icon: <MapPin className="w-3.5 h-3.5 text-rose-400" />,
      prompt: "Which locations are receiving repeated complaints and show top problem areas?",
    },
    {
      label: "Citizen Activity",
      icon: <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />,
      prompt: "What trends have emerged this week and what are the citizen reporting patterns?",
    },
  ];

  // Standard suggested prompts
  const suggestedPrompts = [
    "Who is handling the most cases?",
    "Which officer has the fastest resolution time?",
    "Show duplicate and fake media trends.",
    "What categories of complaints are increasing?"
  ];

  return (
    <div className="space-y-4">
      {/* Quick Predefined Actions */}
      <div>
        <h4 className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-2">
          Smart Predefined Actions
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(action.prompt)}
              className="flex items-center gap-2 text-left p-2 rounded-xl border border-white/5 bg-zinc-950/40 hover:bg-zinc-900/60 hover:border-red-500/20 text-[11px] text-zinc-350 hover:text-white transition-all cursor-pointer group"
            >
              <div className="p-1 rounded bg-zinc-900 border border-white/5 group-hover:border-red-500/10">
                {action.icon}
              </div>
              <span className="font-semibold line-clamp-1">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Prompts */}
      <div>
        <h4 className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-2">
          Suggested Analytical Queries
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(prompt)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/5 bg-zinc-950/20 hover:bg-zinc-900/40 hover:border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer text-left font-medium"
            >
              <HelpCircle className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssistantSuggestions;
