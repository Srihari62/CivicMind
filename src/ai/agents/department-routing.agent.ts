/**
 * @file src/ai/agents/department-routing.agent.ts
 * @description Deterministic Department Routing Agent.
 */

import { CivicReport } from "@/types";

export class DepartmentRoutingAgent {
  public readonly name = "Department Routing Agent";

  // Configurable mapping of category to department name
  private readonly routingMap: Record<string, string>;

  constructor(customMap?: Record<string, string>) {
    this.routingMap = customMap || {
      road_damage: "Roads",
      garbage: "Sanitation",
      street_light: "Electrical",
      water_leakage: "Water Supply",
      water_leak: "Water Supply",
      drainage: "Drainage",
      illegal_dumping: "Sanitation",
      park_damage: "Parks",
      fallen_tree: "Parks",
      traffic_signal: "Traffic",
    };
  }

  /**
   * Executes department routing deterministically in memory.
   */
  public execute(report: CivicReport): string {
    const category = report.metadata?.category || "other";
    const department = this.routingMap[category] || "Roads";
    console.info(`[${this.name}] Routed category "${category}" to department "${department}"`);
    return department;
  }
}

export default DepartmentRoutingAgent;
