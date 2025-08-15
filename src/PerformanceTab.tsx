import React from 'react';
import { PerformanceScore, SavedCompetitor, JudgeCategory } from './types';
import { performanceCategories } from './constants';
import { formatScore } from './utils';

interface PerformanceTabProps {
    competitorName: string;
    setCompetitorName: (name: string) => void;
    judgeName: string;
    setJudgeName: (name: string) => void;
    judgeCategory: JudgeCategory;
    setJudgeCategory: (category: JudgeCategory) => void;
    performanceScores: PerformanceScore;
    setPerformanceScores: (scores: PerformanceScore) => void;
    totalPerformanceScore: number;
    editingCompetitor: SavedCompetitor | null;
    isDisqualified: boolean;
    setIsDisqualified: (dq: boolean) => void;
    resetPerformanceScores: () => void;
    cancelEdit: () => void;
    submitFinalScore: () => void;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
                                                           competitorName,
                                                           setCompetitorName,
                                                           judgeName,
                                                           setJudgeName,
                                                           judgeCategory,
                                                           setJudgeCategory,
                                                           performanceScores,
                                                           setPerformanceScores,
                                                           totalPerformanceScore,
                                                           editingCompetitor,
                                                           isDisqualified,
                                                           setIsDisqualified,
                                                           resetPerformanceScores,
                                                           cancelEdit,
                                                           submitFinalScore
                                                       }) => {
    // Allow saving as long as competitor name and judge name are provided
    // No longer require performance scores > 0
    const canSaveCompetitor = competitorName.trim() && judgeName.trim();

    const handleSubmitFinalScore = () => {
        // Automatically set to performance when submitting from performance tab
        setJudgeCategory('performance');
        submitFinalScore();
    };

    const updateCategoryScore = (category: keyof PerformanceScore, score: number) => {
        if (!isDisqualified) {
            setPerformanceScores({
                ...performanceScores,
                [category]: score
            });
        }
    };

    const getScoreButtons = (category: keyof PerformanceScore) => {
        const buttons = [];
        const currentScore = performanceScores[category] || 0;

        // Create buttons for 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
        for (let i = 0; i <= 10; i++) {
            const score = i * 0.5;
            buttons.push(
                <button
                    key={score}
                    onClick={() => updateCategoryScore(category, score)}
                    className={`level-button ${currentScore === score ? 'level-active' : ''} ${isDisqualified ? 'disabled' : ''}`}
                    style={{ minWidth: '45px' }}
                    disabled={isDisqualified}
                >
                    {formatScore(score)}
                </button>
            );
        }
        return buttons;
    };

    const displayScore = isDisqualified ? 'DQ' : formatScore(totalPerformanceScore);

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
                                'Save competitor with performance scores'
                    }
                >
                    {editingCompetitor ? 'Update Performance Competitor' : 'Save Performance Competitor'}
                    {isDisqualified && ' (DISQUALIFIED)'}
                </button>
            </div>

            {/* Performance Categories - Disabled if DQ */}
            {performanceCategories.map((category) => (
                <div key={category.name} className={`section ${isDisqualified ? 'disabled' : ''}`}>
                    <div className="section-title">
                        {category.name} - Current: {isDisqualified ? 'DQ' : `${formatScore(performanceScores[category.key] || 0)}/5.0`}:
                    </div>
                    <div className="button-row">
                        {getScoreButtons(category.key)}
                    </div>
                    <div className="selected-features">
                        {category.description}
                    </div>
                </div>
            ))}

            {/* Performance Summary */}
            <div className="section">
                <div className="section-title">Performance Summary:</div>
                <div className="details-list">
                    {performanceCategories.map((category) => {
                        const score = isDisqualified ? 0 : (performanceScores[category.key] || 0);
                        return (
                            <div key={category.name} className={`detail-item ${isDisqualified ? 'deduction-item-detail' : ''}`}>
                                <div>
                                    <div className="detail-identifier">{category.name}</div>
                                </div>
                                <div className="detail-score">
                                    <div className={`detail-points ${isDisqualified ? 'deduction-points' : ''}`}>
                                        {isDisqualified ? 'DQ' : `${formatScore(score)}/5.0`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div className={`detail-item performance-total-item ${isDisqualified ? 'deduction-item-detail' : ''}`}>
                        <div>
                            <div className="detail-identifier" style={{ fontWeight: 'bold' }}>Total Performance Score</div>
                        </div>
                        <div className="detail-score">
                            <div className={`detail-points performance-total-points ${isDisqualified ? 'deduction-points' : ''}`}>
                                {isDisqualified ? 'DQ' : `${formatScore(totalPerformanceScore)}/30.0`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reset */}
            <div className="reset-section">
                <button onClick={resetPerformanceScores} className="reset-button" disabled={isDisqualified}>
                    Reset Performance Scores
                </button>
            </div>
        </>
    );
};

export default PerformanceTab;