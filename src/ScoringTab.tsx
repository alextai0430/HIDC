import React from 'react';
import { Feature, Score, SavedCompetitor, JudgeCategory } from './types';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';
import { formatScore, getDifficultyColor } from './utils';

interface ScoringTabProps {
    competitorName: string;
    setCompetitorName: (name: string) => void;
    judgeName: string;
    setJudgeName: (name: string) => void;
    judgeCategory: JudgeCategory;
    setJudgeCategory: (category: JudgeCategory) => void;
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
    isDisqualified: boolean;
    setIsDisqualified: (dq: boolean) => void;
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
                                                   judgeCategory,
                                                   setJudgeCategory,
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
                                                   isDisqualified,
                                                   setIsDisqualified,
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
                                               }) => {const canSaveCompetitor = competitorName.trim() && judgeName.trim() && (scores.length > 0 || isDisqualified);

    const handleSubmitFinalScore = () => {
        setJudgeCategory('technical');
        submitFinalScore();
    };

    const displayScore = isDisqualified ? 'DQ' : (showPoints ? formatScore(totalScore) : '***');

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
                <div className={`score-display ${isDisqualified ? 'score-disqualified' : ''}`}>
                    <div className="score-value" style={isDisqualified ? {color: '#dc2626'} : {}}>
                        {displayScore}
                    </div>
                </div>
            </div>

            {/* Judge Info Section */}
            <div className="section">
                <input
                    type="text"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    className="competitor-input judge-input"
                    placeholder="Judge Name"
                />
            </div>

            {/* DQ Toggle */}
            <div className="section">
                <div className="section-title">Competitor Status:</div>
                <div className="button-row">
                    <button
                        onClick={() => setIsDisqualified(!isDisqualified)}
                        className={`level-button ${isDisqualified ? 'level-active' : ''}`}
                        style={isDisqualified ? {backgroundColor: '#dc2626', color: 'white'} : {}}
                    >
                        {isDisqualified ? 'DISQUALIFIED (Click to Restore)' : 'Disqualify Competitor'}
                    </button>
                </div>
                {isDisqualified && (
                    <div className="selected-features" style={{color: '#dc2626'}}>
                        ⚠️ This competitor is disqualified and will receive 0 points regardless of scores entered.
                    </div>
                )}
            </div>

            {/* Show cancel edit button if editing */}
            {editingCompetitor && (
                <div className="section">
                    <button onClick={cancelEdit} className="cancel-edit-button">
                        Cancel Edit & Restore Original
                    </button>
                </div>
            )}

            {/* Save Competitor Button */}
            <div className="section">
                <button
                    className="submit-final-button"
                    onClick={handleSubmitFinalScore}
                    disabled={!canSaveCompetitor}
                    title={
                        !competitorName.trim() ? 'Enter competitor name to save' :
                            !judgeName.trim() ? 'Enter judge name to save' :
                                (scores.length === 0 && !isDisqualified ? 'No technical scores to save or DQ competitor' : 'Save competitor with technical scores')
                    }
                >
                    {editingCompetitor ? 'Update Technical Competitor' : 'Save Technical Competitor'}
                    {isDisqualified && ' (DISQUALIFIED)'}
                </button>
            </div>

            {/* Tricks Grid and Major Deductions - Disabled if DQ */}
            <div className={`tricks-and-deductions ${isDisqualified ? 'disabled' : ''}`}>
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
                                            onClick={() => !isDisqualified && selectTrick(trick.name, difficulty, score)}
                                            className={`trick-button ${getDifficultyColor(difficulty)} ${isSelected ? 'trick-selected' : ''} ${isDisqualified ? 'disabled' : ''}`}
                                            disabled={isDisqualified}
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
                                onClick={() => !isDisqualified && selectDeduction(deduction)}
                                className={`deduction-button-selectable ${isSelected ? 'deduction-selected' : ''} ${isDisqualified ? 'disabled' : ''}`}
                                disabled={isDisqualified}
                            >
                                <div className="deduction-name">{deduction.name}</div>
                                {showPoints && <div className="deduction-value">{deduction.points}</div>}
                                <div className="deduction-abbrev">{deduction.abbrev}</div>
                            </button>
                        );
                    })}
                    {selectedDeductions.length > 0 && (
                        <div className="selected-features" style={{ marginTop: '8px' }}>
                            Selected: {selectedDeductions.map(d => d.abbrev).join(', ')}
                            {showPoints && ` (${formatScore(selectedDeductions.reduce((sum, d) => sum + d.points, 0))})`}
                        </div>
                    )}
                </div>
            </div>

            {/* Level Selector FIRST - Disabled if DQ */}
            <div className={`section ${isDisqualified ? 'disabled' : ''}`}>
                <div className="section-title">
                    Level {showPoints && (multiplierLevel ? `(×${multiplierLevels[multiplierLevel]})` : '(×1)')}:
                </div>
                <div className="button-row">
                    {[1, 2, 3, 4, 5].map(level => (
                        <button
                            key={level}
                            onClick={() => !isDisqualified && toggleMultiplier(level)}
                            className={`level-button ${multiplierLevel === level ? 'level-active' : ''} ${isDisqualified ? 'disabled' : ''}`}
                            disabled={isDisqualified}
                        >
                            L{level}{showPoints && ` (×${multiplierLevels[level]})`}
                        </button>
                    ))}
                </div>
                {multiplierLevel && (
                    <div className="selected-features">
                        Selected Level: L{multiplierLevel} {showPoints && `(×${multiplierLevels[multiplierLevel]})`}
                    </div>
                )}
            </div>

            {/* Feature Selector SECOND - Disabled if DQ */}
            <div className={`section ${isDisqualified ? 'disabled' : ''}`}>
                <div className="section-title">Features:</div>
                <div className="button-row">
                    {features.map(feature => (
                        <button
                            key={feature.name}
                            onClick={() => !isDisqualified && toggleFeature(feature)}
                            className={`feature-button ${selectedFeatures.find(f => f.name === feature.name) ? 'feature-active' : ''} ${isDisqualified ? 'disabled' : ''}`}
                            disabled={isDisqualified}
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

            {/* Execution Selector THIRD - Disabled if DQ */}
            <div className={`section ${isDisqualified ? 'disabled' : ''}`}>
                <div className="section-title">
                    Execution - Grade of Execution {showPoints && `(×${goeLevels[goeLevel]})`}:
                </div>
                <div className="button-row">
                    {[-3, -2, -1, 0, 1, 2, 3].map(level => (
                        <button
                            key={level}
                            onClick={() => !isDisqualified && setGoeLevel(level)}
                            className={`level-button ${goeLevel === level ? 'goe-active' : ''} ${isDisqualified ? 'disabled' : ''}`}
                            disabled={isDisqualified}
                        >
                            E{level >= 0 ? '+' : ''}{level}{showPoints && ` (${Math.round((goeLevels[level] - 1) * 100)}%)`}
                        </button>
                    ))}
                </div>
                {goeLevel !== 0 && (
                    <div className="selected-features">
                        Selected Execution: E{goeLevel >= 0 ? '+' : ''}{goeLevel} {showPoints && `(×${goeLevels[goeLevel]})`}
                    </div>
                )}
            </div>

            {/* Submit Section - Disabled if DQ */}
            {!isDisqualified && (
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
            )}

            {/* Recent Scores */}
            {scores.length > 0 && !isDisqualified && (
                <div className="section">
                    <div className="section-title">Recent Scores</div>
                    <div className="recent-scores">
                        {scores.slice(-10).map((score) => (
                            <button
                                key={score.id}
                                onClick={() => removeScore(score.id)}
                                className="remove-button"
                                title={`Remove: ${showPoints ? formatScore(score.finalScore) + ' pts' : 'score'}`}
                            >
                                -{score.identifier}{showPoints && ` (${formatScore(score.finalScore)})`}
                            </button>
                        ))}
                    </div>
                    <div className="selected-features" style={{ marginTop: '8px', fontSize: '12px' }}>
                        Order: Trick → Level (L) → Features → Execution (E) → Deductions
                    </div>
                </div>
            )}

            {/* Reset */}
            <div className="reset-section">
                <button onClick={resetScores} className="reset-button" disabled={isDisqualified}>
                    Reset Technical Scores
                </button>
            </div>


        </>
    );
};

export default ScoringTab;