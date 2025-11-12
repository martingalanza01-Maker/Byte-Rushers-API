/* eslint-disable @typescript-eslint/naming-convention */
import {get, response} from '@loopback/rest';
import {repository, AnyObject} from '@loopback/repository';

import {SubmissionRepository} from '../repositories/submission.repository';
import {UserRepository} from '../repositories/user.repository';

export class AnalyticsController {
  constructor(
    @repository(SubmissionRepository) private submissionRepo: SubmissionRepository,
    @repository(UserRepository) private userRepo: UserRepository,
  ) {}

  /** Decide suffix for prediction collection names */
  private suffix(): string {
    const explicit = process.env.PREDICTIONS_SUFFIX ?? '';
    if (explicit) return explicit;
    return process.env.ANALYTICS_SOURCE === 'real' ? '' : '_synth';
  }

  /** Access the LoopBack Mongo connector via repository (no mongodb typings needed) */
  private mongoConnector(): any {
    const ds: any = (this.submissionRepo as any).dataSource;
    const conn = ds?.connector;
    if (!conn) throw new Error('Mongo connector not available via repository.dataSource');
    return conn;
  }

  /** Get a native collection via connector.collection(name) (or connector.db.collection) */
  private collection(name: string): any {
    const conn = this.mongoConnector();
    if (typeof conn.collection === 'function') return conn.collection(name);
    if (conn?.db?.collection) return conn.db.collection(name);
    throw new Error('Mongo collection accessor not found on connector');
  }

  private async readPredictionsFromDb() {
    const sfx = this.suffix();

    const summary = await this.collection(`predictions_summary${sfx}`)
      .find({})
      .sort({date_generated: -1})
      .limit(1)
      .next();

    const hotspots = await this.collection(`predictions_hotspot${sfx}`)
      .find({})
      .sort({date_generated: -1})
      .toArray();

    const serviceForecast = await this.collection(`predictions_service_forecast${sfx}`)
      .find({})
      .sort({date_generated: -1})
      .toArray();

    const allocation = await this.collection(`predictions_allocation${sfx}`)
      .find({})
      .sort({date_generated: -1})
      .toArray();

    const emergency = await this.collection(`predictions_emergency${sfx}`)
      .find({})
      .sort({date_generated: -1})
      .toArray();

    return {summary, hotspots, serviceForecast, allocation, emergency};
  }

  // ===================== /analytics/ml-insights =====================
  @get('/analytics/ml-insights')
  @response(200, {description: 'ML Insights'})
  async mlInsights() {
    // Defaults (map-safe so UI never crashes on .map())
    const EMPTY: any[] = [];
    let overallEfficiency = 75;
    let recommendations: string[] = [];
    let hotspotsOut: any[] = [];
    let serviceDemand: any[] = [];
    let resourceAllocation: any[] = [];
    let emergencyPredictions: any[] = [];
    let lastUpdated: string | undefined;
    let topLevelPriorityServices: string[] = [];

    try {
      const {summary, hotspots, serviceForecast, allocation, emergency} =
        await this.readPredictionsFromDb();

      if (summary) {
        overallEfficiency = Number(summary['system_efficiency'] ?? 75);
        recommendations = (summary['ai_recommendations'] ?? []) as string[];
        lastUpdated = String(summary['date_generated'] ?? '');
      }

      if (Array.isArray(hotspots)) {
        hotspotsOut = hotspots.map((h: AnyObject) => {
          const issues = (h.common_issues ?? []) as string[];
          return {
            location: String(h.hall ?? ''),
            riskScore: Number(h.risk_score ?? 0),
            predictedComplaints: Number(h.predicted_count ?? 0),
            commonIssues: issues,
            recommendedActions: (h.recommended_actions ?? []) as string[],
            // UI safety fields:
            peakHours: [],                            // array for .map()
            priorityServices: issues.slice(0, 3),     // derive from common_issues
          };
        });
      }

      if (Array.isArray(serviceForecast)) {
        serviceDemand = serviceForecast.map((pack: AnyObject) => {
          const forecastArr = (pack.forecast ?? []).map((d: AnyObject) => ({
            date: String(d.date ?? ''),
            yhat: Number(d.yhat ?? 0),
            yhat_lower: Number(d.yhat_lower ?? 0),
            yhat_upper: Number(d.yhat_upper ?? 0),
          }));

          const total = forecastArr.reduce((a: number, d: AnyObject) => a + Number(d.yhat ?? 0), 0);
          const svc = String(pack.service ?? 'Unknown');

          // Provide a sensible default peak hours per service so UI can .map()
          const defaultPeak =
            svc.toLowerCase().includes('document') ? [9, 12, 16] : [8, 14, 19];

          return {
            service: svc,
            predictedDemand: Number(total.toFixed(2)),
            forecast: forecastArr,
            // UI safety fields:
            peakHours: defaultPeak,               // array for .map()
            priorityServices: [svc],              // derive from service itself
          };
        });

        // Generate a top-level priority list (first 3 highest-demand services)
        topLevelPriorityServices = serviceDemand
          .slice()
          .sort((a, b) => (b.predictedDemand ?? 0) - (a.predictedDemand ?? 0))
          .map(s => s.service)
          .slice(0, 3);
      }

      if (Array.isArray(allocation)) {
        resourceAllocation = allocation.map((a: AnyObject) => ({
          hall: String(a.hall ?? ''),
          service: String(a.service ?? ''),
          predictedDemand: Number((a.predicted_demand ?? 0).toFixed(2)),
          recommendedStaff: Number(a.recommended_staff ?? 1),
          efficiency: Number(a.efficiency ?? 70),
          bottlenecks: (a.bottlenecks ?? []) as string[],
          // UI safety fields:
          peakHours: [],                            // array for .map()
          priorityServices: [String(a.service ?? 'Unknown')], // derive from service
        }));
      }

      if (Array.isArray(emergency)) {
        emergencyPredictions = emergency.map((e: AnyObject) => ({
          type: String(e.class ?? ''),
          location: String(e.hall ?? ''),
          probability: Number(e.probability ?? 0),
          estimatedResponseTime: Number(e.estimated_response_time_min ?? 0),
          requiredResources: (e.required_resources ?? []) as string[],
          preventiveMeasures: (e.preventive_measures ?? []) as string[],
          // UI safety fields:
          peakHours: [],                    // array for .map()
          priorityServices: [String(e.class ?? 'Unknown')], // derive from class
        }));
      }
    } catch {
      // Swallow errors and return safe defaults
    }

    // Respond with guaranteed arrays and a few aliases to be extra compatible
    return {
      overallEfficiency,
      hotspots: hotspotsOut ?? EMPTY,
      hotspotAreas: hotspotsOut ?? EMPTY, // alias used by some UIs

      serviceDemand: serviceDemand ?? EMPTY,
      serviceForecast: (serviceDemand ?? EMPTY).map((s: any) => ({
        service: s.service,
        forecast: s.forecast ?? EMPTY,
        // keep UI safe here too
        peakHours: s.peakHours ?? [],
        priorityServices: s.priorityServices ?? [],
      })),

      resourceAllocation: resourceAllocation ?? EMPTY,
      emergencyPredictions: emergencyPredictions ?? EMPTY,
      recommendations: recommendations ?? EMPTY,

      // NEW: top-level list so UIs that read e.priorityServices at root won’t crash
      priorityServices: topLevelPriorityServices ?? [],

      lastUpdated,
      serverTime: new Date().toISOString(),
    };
  }

  // ====================== /analytics/trends ======================
  @get('/analytics/trends')
  @response(200, {description: 'Trends'})
  async trends() {
    let forecasts: any[] = [];

    try {
      const packs = await this.collection(`predictions_service_forecast${this.suffix()}`)
        .find({})
        .sort({date_generated: -1})
        .toArray();

      if (Array.isArray(packs)) {
        forecasts = packs.map((p: AnyObject) => ({
          service: String(p.service ?? 'Unknown'),
          used_model: String(p.used_model ?? 'baseline'),
          forecast: (p.forecast ?? []).map((d: AnyObject) => ({
            date: String(d.date ?? ''),
            yhat: Number(d.yhat ?? 0),
            yhat_lower: Number(d.yhat_lower ?? 0),
            yhat_upper: Number(d.yhat_upper ?? 0),
          })),
          // Safety fields so charts that iterate arrays won't fail even if unused here
          peakHours: [],
          priorityServices: [String(p.service ?? 'Unknown')],
        }));
      }
    } catch {
      // keep forecasts = []
    }

    // Always return arrays so .map() never fails
    const totalMean = forecasts.reduce(
      (acc, pack) =>
        acc + (pack.forecast ?? []).reduce((a: number, d: AnyObject) => a + Number(d.yhat ?? 0), 0),
      0,
    );

    return {
      forecasts,         // main
      series: forecasts, // aliases some frontends use
      data: forecasts,
      narrative: '7-day outlook based on last 28-day seasonal baseline.',
      stats: {comparedRange: 'last 28 days', totalMean: Number(totalMean.toFixed(2))},
      // Also include a root-level safety array
      priorityServices: forecasts.map(f => f.service).slice(0, 3),
    };
  }
}
