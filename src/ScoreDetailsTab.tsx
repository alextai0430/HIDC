import React from 'react';
import { Score } from './types';
import { goeLevels } from './constants';
import { formatScore } from './utils';

interface ScoreDetailsTabProps {
    competitorName: string;
    totalScore: number;
    scores: Score[];
    removeScore: (scoreId: number) => void;
}

const ScoreDetailsTab: React.FC<ScoreDetailsTabProps> = ({
                                                             competitorName,
                                                             totalScore,
                                                             scores,
                                                             removeScore
                                                         }) => {
    return (
        <>
            {/* Score Details Tab */}
            <div className="details-header">
                <h2 className="details-title">Detailed Score Breakdown</h2>
                <div className="details-total">Total: {formatScore(totalScore)}</div>
            </div>

            {competitorName && (
                <div className="competitor-name">Competitor: {competitorName}</div>
            )}

            <div className="details-list">
                {scores.map((score, index) => (
                    <div key={score.id} className={`detail-item ${score.difficulty === 'DEDUCTION' ? 'deduction-item-detail' : ''}`}>
                        <div>
                            <div className="detail-identifier">
                                {index + 1}. {score.identifier}
                            </div>
                            <div className="detail-breakdown">
                                {score.difficulty === 'DEDUCTION' ?
                                    `${score.trick} - Deduction: ${formatScore(score.baseScore)}` :
                                    `${score.trick} (${score.difficulty}) - Base: ${formatScore(score.baseScore)}
                                    ${score.features.length > 0 ? ` + Features: ${score.features.map(f => f.abbrev).join(', ')}` : ''}
                                    ${score.goeLevel !== 0 ? ` × GOE: ${goeLevels[score.goeLevel]}` : ''}
                                    ${score.multiplierLevel ? ` × Multiplier Level ${score.multiplierLevel}` : ''}`
                                }
                            </div>
                        </div>
                        <div className="detail-score">
                            <div className={`detail-points ${score.difficulty === 'DEDUCTION' ? 'deduction-points' : ''}`}>
                                {formatScore(score.finalScore)}
                            </div>
                            <button
                                onClick={() => removeScore(score.id)}
                                className="detail-remove"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
                {scores.length === 0 && (
                    <div className="no-scores">
                        No scores recorded yet. Switch to the Scoring tab to add tricks.
                    </div>
                )}
            </div>
        </>
    );
};

export default ScoreDetailsTab;