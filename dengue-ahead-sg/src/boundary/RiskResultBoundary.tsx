/**
 * Traces to: RiskResultBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk
 *
 * IMPLEMENTS:
 * - showAssessment() — display risk level, 14-day prediction, assessment time, data confidence,
 *   factor contributions with explanations, cluster info, personalised prevention tips and the
 *   disclaimer, plus the "Simulate" and "Back" actions
 *
 * Calls: PreventionGuidanceControl (generateTips) for the tips at the bottom of the screen.
 * Backlog #18.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { DengueCluster } from "../entity/DengueCluster.ts";
import type { PlanningSubzone } from "../entity/PlanningSubzone.ts";
import type { PreventionTask } from "../entity/PreventionTask.ts";
import type { RiskAssessment } from "../entity/RiskAssessment.ts";
import { ContributionLevel, DataConfidence, RiskFactorType, RiskLevel } from "../entity/enums.ts";
import { PreventionGuidanceControl } from "../control/PreventionGuidanceControl.ts";
import { getRiskLevelStyle } from "./riskLevelStyle.ts";
import DashboardIcon, { PreventionIcon } from "./DashboardIcon.tsx";

export interface RiskResultBoundaryProps {
    /** Embed the factors and tips below the dashboard's area preview. */
    embedded?: boolean;
    subzone: PlanningSubzone;
    assessment: RiskAssessment;
    clusters?: DengueCluster[];
    /** Supplies the tips. Defaults to the bundled NEA guidance, so start-up does not have to pass it. */
    preventionControl?: PreventionGuidanceControl;
    onSimulate?: (baselineAssessment: RiskAssessment) => void;
    onBack?: () => void;
}

const defaultPreventionControl = new PreventionGuidanceControl();

const DISCLAIMER =
    "This is an estimate based on public data and a simple model. It is not an official NEA forecast or medical advice.";

const FACTOR_LABELS: Record<RiskFactorType, string> = {
    [RiskFactorType.DengueClusters]: "Dengue clusters nearby",
    [RiskFactorType.HighAedesArea]: "High-Aedes area overlap",
    [RiskFactorType.PopulationDensity]: "Population density",
    [RiskFactorType.Humidity]: "Humidity (latest month)",
    [RiskFactorType.LaggedRainfall]: "Rainfall from 2-3 months ago",
};

const CONTRIBUTION_LABELS: Record<ContributionLevel, string> = {
    [ContributionLevel.Low]: "Low contribution",
    [ContributionLevel.Moderate]: "Moderate contribution",
    [ContributionLevel.High]: "High contribution",
};

const FACTOR_ICONS: Record<RiskFactorType, string> = {
    [RiskFactorType.DengueClusters]: "shield",
    [RiskFactorType.HighAedesArea]: "mosquito",
    [RiskFactorType.PopulationDensity]: "people",
    [RiskFactorType.Humidity]: "cloud",
    [RiskFactorType.LaggedRainfall]: "rain",
};

const CONFIDENCE_TEXT: Record<DataConfidence, { label: string; text: string }> = {
    [DataConfidence.High]: {
        label: "High",
        text: "All data sources were available and up to date.",
    },
    [DataConfidence.Medium]: {
        label: "Medium",
        text: "One data source was missing or out of date, so treat this result with a little more care.",
    },
    [DataConfidence.Low]: {
        label: "Low",
        text: "Several data sources were missing, so this result is less reliable.",
    },
};

const TIPS_HEADING_SUFFIX: Record<RiskLevel, string> = {
    [RiskLevel.Low]: "keep up the basics",
    [RiskLevel.Moderate]: "stay vigilant",
    [RiskLevel.High]: "take extra precautions",
    [RiskLevel.VeryHigh]: "act today",
};

function tipsHeading(level: RiskLevel): string {
    const suffix: string | undefined = TIPS_HEADING_SUFFIX[level];
    if (!suffix) return "Prevention tips";
    return `Your area is ${getRiskLevelStyle(level).label.toUpperCase()} risk: ${suffix}`;
}

function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Singapore",
    }).format(date);
}

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
}

type TipsState =
    | { status: "loading" }
    | { status: "ready"; tips: PreventionTask[] }
    | { status: "unavailable" };

interface TipsSectionProps {
    assessment: RiskAssessment;
    subzone: PlanningSubzone;
    control: PreventionGuidanceControl;
}

// Bottom of the screen: tips chosen for this assessment. Keyed by the parent so it restarts for a new result.
function TipsSection({ assessment, subzone, control }: TipsSectionProps) {
    const [state, setState] = useState<TipsState>({ status: "loading" });

    useEffect(() => {
        let cancelled = false;
        control
            .generateTips(assessment, subzone)
            .then((tips) => {
                if (!cancelled) setState({ status: "ready", tips });
            })
            .catch(() => {
                if (!cancelled) setState({ status: "unavailable" });
            });
        return () => {
            cancelled = true;
        };
    }, [control, assessment, subzone]);

    const level = assessment.riskLevel;
    const urgent = level === RiskLevel.High || level === RiskLevel.VeryHigh;

    return (
        <section
            aria-labelledby="tips-heading"
            className="card prevention-panel area-recommendations"
        >
            <div className="section-title">
                <h2 id="tips-heading">Recommended for {subzone.name}</h2>
                <span
                    className="risk-pill"
                    style={{
                        backgroundColor: getRiskLevelStyle(level).colour,
                        color: getRiskLevelStyle(level).textColour,
                    }}
                >
                    {getRiskLevelStyle(level).label} risk
                </span>
            </div>
            <p className="section-description">
                Advice selected for this area's current risk and main factors.
            </p>
            <p className="small">{tipsHeading(level)}</p>
            {urgent && (
                <p id="precautions-note">
                    <strong>Take extra precautions.</strong> These steps follow NEA guidance.
                </p>
            )}
            <div aria-live="polite">
                {state.status === "loading" && <p>Loading prevention tips...</p>}
                {state.status === "unavailable" && (
                    <p role="alert">
                        Prevention tips are unavailable right now. See the{" "}
                        <a
                            href="https://www.nea.gov.sg/dengue-zika"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            NEA dengue pages
                        </a>{" "}
                        for guidance.
                    </p>
                )}
                {state.status === "ready" && (
                    <ul aria-label="Prevention tips" className="prevention-cards">
                        {state.tips.map((tip) => (
                            <li key={tip.taskId}>
                                <details>
                                    <summary>
                                        <PreventionIcon taskId={tip.taskId} />
                                        <strong>{tip.actionText}</strong>
                                        <span className="small">Details &amp; NEA source</span>
                                    </summary>
                                    <p>{tip.explanation}</p>
                                    <a
                                        href={tip.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Source: NEA
                                    </a>
                                </details>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

export function RiskResultBoundary(props: RiskResultBoundaryProps) {
    // showAssessment() - display risk level, 14-day prediction, assessment time, data confidence,
    // factor contributions + explanations, cluster info, tips, disclaimer, and "Simulate" button
    const showAssessment = (): ReactNode => {
        const { assessment, subzone, clusters } = props;
        const style = getRiskLevelStyle(assessment.riskLevel);
        const confidence = CONFIDENCE_TEXT[assessment.dataConfidence] as
            | { label: string; text: string }
            | undefined;
        const contributions = [...(assessment.contributions ?? [])].sort(
            (a, b) => b.contribution - a.contribution,
        );
        const largestContribution = Math.max(1, contributions[0]?.contribution ?? 0);

        return (
            <>
                {!props.embedded && (
                    <>
                        <h1>{subzone.name}</h1>
                        <p>
                            <span
                                className="risk-pill"
                                style={{ backgroundColor: style.colour, color: style.textColour }}
                            >
                                {style.label}
                            </span>{" "}
                            <span>
                                Risk index {assessment.riskIndex} out of 100 ·{" "}
                                {assessment.horizonDays}-day prediction
                            </span>
                        </p>
                        <p>
                            Assessed {formatTimestamp(assessment.generatedAt)} using data from{" "}
                            {formatTimestamp(assessment.dataTimeStamp)}.
                        </p>

                        <section aria-labelledby="confidence-heading">
                            <h2 id="confidence-heading">Data confidence</h2>
                            <p>
                                <strong>
                                    Data confidence:{" "}
                                    {confidence?.label ?? assessment.dataConfidence}
                                </strong>
                                {confidence && <> {confidence.text}</>}
                            </p>
                        </section>
                    </>
                )}

                <section aria-labelledby="factors-heading" className="card risk-factors">
                    <h2 id="factors-heading">
                        {props.embedded
                            ? "What contributes to the current risk?"
                            : "Why this level"}
                    </h2>
                    {contributions.length === 0 ? (
                        <p>Factor details are not available for this assessment.</p>
                    ) : (
                        <ol aria-label="Risk factor contributions" className="factor-grid">
                            {contributions.map((item) => (
                                <li key={item.factorType}>
                                    <DashboardIcon name={FACTOR_ICONS[item.factorType]} />
                                    <strong>
                                        {FACTOR_LABELS[item.factorType] ?? item.factorType}
                                    </strong>{" "}
                                    <span className="factor-value">
                                        {item.contribution.toFixed(1)} points ·{" "}
                                        {CONTRIBUTION_LABELS[item.contributionLevel] ??
                                            item.contributionLevel}
                                    </span>
                                    <div className="factor-track" aria-hidden="true">
                                        <span
                                            style={{
                                                width: `${(item.contribution / largestContribution) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <details>
                                        <summary>Why this matters</summary>
                                        <p>{item.explanation}</p>
                                    </details>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                {clusters && (
                    <section aria-labelledby="clusters-heading" className="cluster-status">
                        <h2 id="clusters-heading">Dengue clusters in this area</h2>
                        {clusters.length === 0 ? (
                            <p>No active dengue clusters are recorded in this area.</p>
                        ) : (
                            <p>
                                {plural(clusters.length, "active dengue cluster")} recorded here,
                                with{" "}
                                {plural(
                                    clusters.reduce(
                                        (total, cluster) => total + cluster.caseCount,
                                        0,
                                    ),
                                    "case",
                                )}{" "}
                                in total.
                            </p>
                        )}
                    </section>
                )}

                {!props.embedded && (
                    <div className="actions">
                        {props.onSimulate && (
                            <button
                                type="button"
                                className="primary"
                                onClick={() => props.onSimulate?.(assessment)}
                            >
                                Simulate a scenario
                            </button>
                        )}
                        {props.onBack && (
                            <button type="button" className="secondary" onClick={props.onBack}>
                                Back
                            </button>
                        )}
                    </div>
                )}

                <TipsSection
                    key={`${assessment.assessmentId}-${subzone.subzoneId}`}
                    assessment={assessment}
                    subzone={subzone}
                    control={props.preventionControl ?? defaultPreventionControl}
                />

                <aside aria-label="Disclaimer">
                    <p>{DISCLAIMER}</p>
                </aside>
            </>
        );
    };
    return <section aria-label="Risk assessment result">{showAssessment()}</section>;
}

export default RiskResultBoundary;
