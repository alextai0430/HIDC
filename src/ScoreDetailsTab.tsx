import React from 'react';
import { Score, SavedCompetitor } from './types';
import { formatScore, getDifficultyColor } from './utils';
import { goeLevels, multiplierLevels } from './constants';

interface ScoreDetailsTabProps {
    competitorName: string;
    totalScore: number;
    scores: Score[];
    removeScore: (scoreId: number) => void;
    savedCompetitors: SavedCompetitor[];
}

const ScoreDetailsTab: React.FC<ScoreDetailsTabProps> = ({
                                                             competitorName,
                                                             totalScore,
                                                             scores,
                                                             removeScore
                                                         }) => {
    const formatScoreBreakdown = (score: Score) => {
        if (score.difficulty === 'DEDUCTION') {
            return `${score.trick} - Deduction: ${formatScore(score.baseScore)}`;
        }

        let breakdown = `${score.trick} (${score.difficulty}) - Base: ${formatScore(score.baseScore)}`;

        // 1. Level multiplier
        if (score.multiplierLevel) {
            breakdown += ` × Level L${score.multiplierLevel} (×${multiplierLevels[score.multiplierLevel]})`;
        }

        // 2. Features
        if (score.features.length > 0) {
            const featureDetails = score.features.map(f =>
                `${f.abbrev}${f.multiplier ? `(×${f.multiplier})` : f.points ? `(+${f.points})` : ''}`
            ).join(', ');
            breakdown += ` + Features: ${featureDetails}`;
        }

        // 3. Execution
        if (score.goeLevel !== 0) {
            breakdown += ` × Execution: E${score.goeLevel >= 0 ? '+' : ''}${score.goeLevel} (×${goeLevels[score.goeLevel]})`;
        }

        // 4. Deductions
        if (score.deductions && score.deductions.length > 0) {
            const deductionDetails = score.deductions.map(d => `${d.abbrev}(${d.points})`).join(', ');
            breakdown += ` + Deductions: ${deductionDetails}`;
        }

        return breakdown;
    };

    return (
        <>
            <div className="details-header">
                <h2 className="details-title">Score Details - {competitorName || 'Unnamed Competitor'}</h2>
                <div className="details-total">
                    Total: {formatScore(totalScore)}
                </div>
            </div>

            {scores.length === 0 ? (
                <div className="section">
                    <div className="selected-features">
                        No scores recorded yet. Add scores from the Technical tab.
                    </div>
                </div>
            ) : (
                <div className="section">
                    <div className="section-title">
                        Technical Scores ({scores.length}) - Trick → Level (L) → Features → Execution (E) → Deductions:
                    </div>
                    <div className="details-list">
                        {scores.map((score, index) => (
                            <div key={score.id} className={`detail-item ${score.difficulty === 'DEDUCTION' ? 'deduction-item-detail' : ''}`}>
                                <div>
                                    <div className="detail-identifier">
                                        {index + 1}. {score.identifier}
                                    </div>
                                    <div className="detail-breakdown">
                                        {formatScoreBreakdown(score)}
                                    </div>
                                </div>
                                <div className="detail-score">
                                    <div className={`detail-points ${score.difficulty === 'DEDUCTION' ? 'deduction-points' : ''}`}>
                                        {formatScore(score.finalScore)}
                                    </div>
                                    <button
                                        onClick={() => removeScore(score.id)}
                                        className="detail-remove"
                                        title="Remove this score"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="section">
                <div className="section-title">Calculation Process:</div>
                <div className="selected-features">
                    <strong>Step 1:</strong> Select base trick and difficulty<br/>
                    <strong>Step 2:</strong> Apply Level multiplier (L1-L5)<br/>
                    <strong>Step 3:</strong> Add/multiply Features (T1, T2, T3, A)<br/>
                    <strong>Step 4:</strong> Apply Execution grade (E-3 to E+3)<br/>
                    <strong>Step 5:</strong> Add any deductions (Drop, Tang, Time, Other)<br/>
                    <strong>Note:</strong> All multipliers compound together for the final score
                </div>
            </div>
        </>
    );
};

export default ScoreDetailsTab;