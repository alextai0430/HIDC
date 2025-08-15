import React from 'react';
import { Feature, Score, SavedCompetitor } from './types';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';
import { formatScore, getDifficultyColor } from './utils';

interface ScoringTabProps {
    competitorName: string;
    setCompetitorName: (name: string) => void;
    judgeName: string;
    setJudgeName: (name: string) => void;
    totalScore: number;
    scores: Score[];
    editingCompetitor: SavedCompetitor | null;
    selectedTrick: {name: string, difficulty: string, baseScore: number} | null;
    selectedDeductions: {name: string, points: number, abbrev: string}[];
    selectedFeatures: Feature[];
    goeLevel: number;
    multiplierLevel: number | null;
    showPoints: boolean;
    isAdmin: boolean;
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
    submitFinalScore: () => void;
}

const ScoringTab: React.FC<ScoringTabProps> = ({
                                                   competitorName,
                                                   setCompetitorName,
                                                   judgeName,
                                                   setJudgeName,
                                                   totalScore,
                                                   scores,
                                                   editingCompetitor,
                                                   selectedTrick,
                                                   selectedDeductions,
                                                   selectedFeatures,
                                                   goeLevel,
                                                   multiplierLevel,
                                                   showPoints,
                                                   isAdmin,
                                                   selectTrick,
                                                   selectDeduction,
                                                   setGoeLevel,
                                                   toggleMultiplier,
                                                   toggleFeature,
                                                   getPreviewScore,
                                                   submitScore,
                                                   removeScore,
                                                   resetScores,
                                                   cancelEdit,
                                                   submitFinalScore
                                               }) => {
    const canSaveCompetitor = competitorName.trim() && scores.length > 0;

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
                    <div className="score-value">{showPoints ? formatScore(totalScore) : '***'}</div>
                </div>
            </div>

            {/* Judge Name Section - show for admin or if editing */}
            {(isAdmin || editingCompetitor) && (
                <div className="section">
                    <input
                        type="text"
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        className="competitor-input"
                        placeholder={isAdmin ? "Judge Name (Required for Admin)" : "Judge Name"}
                        style={{ marginBottom: '8px' }}
                    />
                </div>
            )}

            {/* Show cancel edit button if editing */}
            {editingCompetitor && (
                <div className="section">
                    <button onClick={cancelEdit} className="cancel-edit-button">
                        Cancel Edit & Restore Original
                    </button>
                </div>
            )}

            {/* Save Competitor Button for non-admin users */}
            {!isAdmin && (
                <div className="section">
                    <button
                        className="submit-final-button"
                        onClick={submitFinalScore}
                        disabled={!canSaveCompetitor}
                        title={
                            !competitorName.trim() ? 'Enter competitor name to save' :
                                (scores.length === 0 ? 'No scores to save' : 'Save competitor')
                        }
                    >
                        {editingCompetitor ? 'Update Competitor' : 'Save Competitor'}
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
                                            {showPoints && <div className="score-label">{formatScore(score)}</div>}
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
                        const isSelected = selectedDeductions.find(d => d.name === deduction.name);
                        return (
                            <button
                                key={deduction.name}
                                onClick={() => selectDeduction(deduction)}
                                className={`deduction-button-selectable ${isSelected ? 'deduction-selected' : ''}`}
                            >
                                <div className="deduction-name">{deduction.name}</div>
                                {showPoints && <div className="deduction-value">{deduction.points}</div>}
                                <div className="deduction-abbrev">{deduction.abbrev}</div>
                            </button>
                        );
                    })}
                    {/* Display selected deductions */}
                    {selectedDeductions.length > 0 && (
                        <div className="selected-features" style={{ marginTop: '8px' }}>
                            Selected: {selectedDeductions.map(d => d.abbrev).join(', ')}
                            {showPoints && ` (${formatScore(selectedDeductions.reduce((sum, d) => sum + d.points, 0))})`}
                        </div>
                    )}
                </div>
            </div>

            {/* GOE Selector */}
            <div className="section">
                <div className="section-title">
                    GOE - Grade of Execution {showPoints && `(×${goeLevels[goeLevel]})`}:
                </div>
                <div className="button-row">
                    {[-3, -2, -1, 0, 1, 2, 3].map(level => (
                        <button
                            key={level}
                            onClick={() => setGoeLevel(level)}
                            className={`level-button ${goeLevel === level ? 'goe-active' : ''}`}
                        >
                            {level >= 0 ? '+' : ''}{level}{showPoints && ` (${Math.round((goeLevels[level] - 1) * 100)}%)`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Multiplier Level Selector */}
            <div className="section">
                <div className="section-title">
                    Multiplier Level {showPoints && (multiplierLevel ? `(×${multiplierLevels[multiplierLevel]})` : '(×1)')}:
                </div>
                <div className="button-row">
                    {[1, 2, 3, 4, 5].map(level => (
                        <button
                            key={level}
                            onClick={() => toggleMultiplier(level)}
                            className={`level-button ${multiplierLevel === level ? 'level-active' : ''}`}
                        >
                            {level}{showPoints && ` (×${multiplierLevels[level]})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feature Selector */}
            <div className="section">
                <div className="section-title">Features:</div>
                <div className="button-row">
                    {features.map(feature => (
                        <button
                            key={feature.name}
                            onClick={() => toggleFeature(feature)}
                            className={`feature-button ${selectedFeatures.find(f => f.name === feature.name) ? 'feature-active' : ''}`}
                        >
                            {feature.abbrev}{showPoints && (feature.multiplier ? ` (×${feature.multiplier})` : ` (+${feature.points})`)}
                        </button>
                    ))}
                </div>
                {selectedFeatures.length > 0 && (
                    <div className="selected-features">
                        Selected: {selectedFeatures.map(f => f.abbrev).join(', ')}
                    </div>
                )}
            </div>

            {/* Submit Section */}
            <div className="section">
                <div className="section-title">
                    Submit Score {selectedTrick && `- ${selectedTrick.name} (${selectedTrick.difficulty})`}
                    {selectedDeductions.length > 0 && `- ${selectedDeductions.map(d => d.abbrev).join(', ')}`}
                    {showPoints && (selectedTrick || selectedDeductions.length > 0) && ` - Preview: ${formatScore(getPreviewScore())}`}
                </div>
                <button
                    onClick={submitScore}
                    className={`submit-button ${(selectedTrick || selectedDeductions.length > 0) ? 'submit-ready' : ''}`}
                    disabled={!selectedTrick && selectedDeductions.length === 0}
                >
                    {(selectedTrick || selectedDeductions.length > 0) ?
                        (showPoints ? `Submit Score (${formatScore(getPreviewScore())})` : 'Submit Score') :
                        'Select a trick or deduction first'
                    }
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
                                title={`Remove: ${showPoints ? formatScore(score.finalScore) + ' pts' : 'score'}`}
                            >
                                -{score.description}{showPoints && ` (${formatScore(score.finalScore)})`}
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