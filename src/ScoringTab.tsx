import React from 'react';
import { Feature, Score, SavedCompetitor } from './types';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';
import { formatScore, getDifficultyColor } from './utils';

interface ScoringTabProps {
    competitorName: string;
    setCompetitorName: (name: string) => void;
    totalScore: number;
    scores: Score[];
    editingCompetitor: SavedCompetitor | null;
    selectedTrick: {name: string, difficulty: string, baseScore: number} | null;
    selectedDeduction: {name: string, points: number, abbrev: string} | null;
    selectedFeatures: Feature[];
    goeLevel: number;
    multiplierLevel: number | null;
    selectTrick: (trickName: string, difficulty: string, baseScore: number) => void;
    selectDeduction: (deduction: {name: string, points: number, abbrev: string}) => void;
    setGoeLevel: (level: number) => void;
    toggleMultiplier: (level: number) => void;
    toggleFeature: (feature: Feature) => void;
    getPreviewScore: () => number;
    submitScore: () => void;
    removeScore: (scoreId: number) => void;
    resetScores: () => void;
    cancelEdit: () => void;
}

const ScoringTab: React.FC<ScoringTabProps> = ({
                                                   competitorName,
                                                   setCompetitorName,
                                                   totalScore,
                                                   scores,
                                                   editingCompetitor,
                                                   selectedTrick,
                                                   selectedDeduction,
                                                   selectedFeatures,
                                                   goeLevel,
                                                   multiplierLevel,
                                                   selectTrick,
                                                   selectDeduction,
                                                   setGoeLevel,
                                                   toggleMultiplier,
                                                   toggleFeature,
                                                   getPreviewScore,
                                                   submitScore,
                                                   removeScore,
                                                   resetScores,
                                                   cancelEdit
                                               }) => {
    return (
        <>
            {/* Competitor Info & Score */}
            <div className="competitor-section">
                <input
                    type="text"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    className="competitor-input"
                    placeholder="Competitor Name"
                />
                <div className="score-display">
                    <div className="score-value">{formatScore(totalScore)}</div>
                </div>
            </div>

            {/* Show cancel edit button if editing */}
            {editingCompetitor && (
                <div className="section">
                    <button onClick={cancelEdit} className="cancel-edit-button">
                        Cancel Edit & Restore Original
                    </button>
                </div>
            )}

            {/* Tricks Grid and Major Deductions */}
            <div className="tricks-and-deductions">
                <div className="tricks-grid">
                    {tricks.map((trick) => (
                        <div key={trick.name} className="trick-row">
                            <div className="trick-label">{trick.abbrev}</div>
                            <div className="trick-buttons">
                                {Object.entries(trick.scores).map(([difficulty, score]) => {
                                    if (score === 0) return <div key={difficulty}></div>;

                                    const isSelected = selectedTrick?.name === trick.name && selectedTrick?.difficulty === difficulty;

                                    return (
                                        <button
                                            key={difficulty}
                                            onClick={() => selectTrick(trick.name, difficulty, score)}
                                            className={`trick-button ${getDifficultyColor(difficulty)} ${isSelected ? 'trick-selected' : ''}`}
                                        >
                                            <div className="difficulty-label">{difficulty}</div>
                                            <div className="score-label">{formatScore(score)}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="major-deductions">
                    <div className="section-title">Major Deductions</div>
                    {majorDeductions.map((deduction) => {
                        const isSelected = selectedDeduction?.name === deduction.name;
                        return (
                            <button
                                key={deduction.name}
                                onClick={() => selectDeduction(deduction)}
                                className={`deduction-button-selectable ${isSelected ? 'deduction-selected' : ''}`}
                            >
                                <div className="deduction-name">{deduction.name}</div>
                                <div className="deduction-value">{deduction.points}</div>
                                <div className="deduction-abbrev">{deduction.abbrev}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* GOE Selector - disabled for deductions */}
            <div className="section">
                <div className="section-title">GOE - Grade of Execution (×{goeLevels[goeLevel]}) {selectedDeduction && '(Disabled for deductions)'}:</div>
                <div className="button-row">
                    {[-3, -2, -1, 0, 1, 2, 3].map(level => (
                        <button
                            key={level}
                            onClick={() => !selectedDeduction && setGoeLevel(level)}
                            className={`level-button ${goeLevel === level ? 'goe-active' : ''} ${selectedDeduction ? 'disabled' : ''}`}
                            disabled={!!selectedDeduction}
                        >
                            {level >= 0 ? '+' : ''}{level} ({Math.round((goeLevels[level] - 1) * 100)}%)
                        </button>
                    ))}
                </div>
            </div>

            {/* Multiplier Level Selector - disabled for deductions */}
            <div className="section">
                <div className="section-title">
                    Multiplier Level {multiplierLevel ? `(×${multiplierLevels[multiplierLevel]})` : '(×1)'} {selectedDeduction && '(Disabled for deductions)'}:
                </div>
                <div className="button-row">
                    {[1, 2, 3, 4, 5].map(level => (
                        <button
                            key={level}
                            onClick={() => !selectedDeduction && toggleMultiplier(level)}
                            className={`level-button ${multiplierLevel === level ? 'level-active' : ''} ${selectedDeduction ? 'disabled' : ''}`}
                            disabled={!!selectedDeduction}
                        >
                            {level} (×{multiplierLevels[level]})
                        </button>
                    ))}
                </div>
            </div>

            {/* Feature Selector - disabled for deductions */}
            <div className="section">
                <div className="section-title">Features {selectedDeduction && '(Disabled for deductions)'}:</div>
                <div className="button-row">
                    {features.map(feature => (
                        <button
                            key={feature.name}
                            onClick={() => !selectedDeduction && toggleFeature(feature)}
                            className={`feature-button ${selectedFeatures.find(f => f.name === feature.name) ? 'feature-active' : ''} ${selectedDeduction ? 'disabled' : ''}`}
                            disabled={!!selectedDeduction}
                        >
                            {feature.abbrev} {feature.multiplier ? `(×${feature.multiplier})` : `(+${feature.points})`}
                        </button>
                    ))}
                </div>
                {selectedFeatures.length > 0 && !selectedDeduction && (
                    <div className="selected-features">
                        Selected: {selectedFeatures.map(f => f.abbrev).join(', ')}
                    </div>
                )}
            </div>

            {/* Submit Section */}
            <div className="section">
                <div className="section-title">
                    Submit Score {selectedTrick && `- ${selectedTrick.name} (${selectedTrick.difficulty})`}
                    {selectedDeduction && `- ${selectedDeduction.name}`}
                    {(selectedTrick || selectedDeduction) && ` - Preview: ${formatScore(getPreviewScore())}`}
                </div>
                <button
                    onClick={submitScore}
                    className={`submit-button ${(selectedTrick || selectedDeduction) ? 'submit-ready' : ''}`}
                    disabled={!selectedTrick && !selectedDeduction}
                >
                    {(selectedTrick || selectedDeduction) ? `Submit Score (${formatScore(getPreviewScore())})` : 'Select a trick or deduction first'}
                </button>
            </div>

            {/* Recent Scores */}
            {scores.length > 0 && (
                <div className="section">
                    <div className="section-title">Recent Scores:</div>
                    <div className="recent-scores">
                        {scores.slice(-10).map((score) => (
                            <button
                                key={score.id}
                                onClick={() => removeScore(score.id)}
                                className="remove-button"
                                title={`Remove: ${formatScore(score.finalScore)} pts`}
                            >
                                -{score.description} ({formatScore(score.finalScore)})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Reset */}
            <div className="reset-section">
                <button onClick={resetScores} className="reset-button">
                    Reset
                </button>
            </div>
        </>
    );
};

export default ScoringTab;