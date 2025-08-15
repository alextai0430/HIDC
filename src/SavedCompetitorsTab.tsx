import React from 'react';
import { SavedCompetitor } from './types';
import { goeLevels } from './constants';
import { formatScore, formatDate } from './utils';

interface SavedCompetitorsTabProps {
    savedCompetitors: SavedCompetitor[];
    selectedCompetitorDetails: SavedCompetitor | null;
    setSelectedCompetitorDetails: (competitor: SavedCompetitor | null) => void;
    loadCompetitorForEditing: (competitor: SavedCompetitor) => void;
    deleteCompetitor: (competitorId: string) => void;
}

const SavedCompetitorsTab: React.FC<SavedCompetitorsTabProps> = ({
                                                                     savedCompetitors,
                                                                     selectedCompetitorDetails,
                                                                     setSelectedCompetitorDetails,
                                                                     loadCompetitorForEditing,
                                                                     deleteCompetitor
                                                                 }) => {
    return (
        <>
            {/* Saved Competitors Tab */}
            <div className="details-header">
                <h2 className="details-title">Saved Competitors</h2>
                <div className="details-total">{savedCompetitors.length} competitors</div>
            </div>

            {selectedCompetitorDetails ? (
                <>
                    <div className="section">
                        <button
                            onClick={() => setSelectedCompetitorDetails(null)}
                            className="level-button"
                        >
                            ← Back to competitors list
                        </button>
                    </div>

                    <div className="details-header">
                        <h2 className="details-title">{selectedCompetitorDetails.name}</h2>
                        <div className="details-total">Total: {formatScore(selectedCompetitorDetails.totalScore)}</div>
                    </div>

                    <div className="competitor-name">
                        Submitted: {formatDate(selectedCompetitorDetails.submittedAt)}
                    </div>

                    <div className="details-list">
                        {selectedCompetitorDetails.scores.map((score, index) => (
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
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="competitor-list">
                    {savedCompetitors.length === 0 ? (
                        <div className="no-competitors">
                            No competitors saved yet. Complete scoring and submit from the Export/Submit tab to save competitors here.
                        </div>
                    ) : (
                        savedCompetitors.map((competitor) => (
                            <div
                                key={competitor.id}
                                className="competitor-item"
                                onClick={() => setSelectedCompetitorDetails(competitor)}
                            >
                                <div className="competitor-item-header">
                                    <h3 className="competitor-item-name">{competitor.name}</h3>
                                    <div className="competitor-actions">
                                        <button
                                            className="edit-competitor"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                loadCompetitorForEditing(competitor);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="delete-competitor"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteCompetitor(competitor.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="competitor-item-score">
                                    Total Score: {formatScore(competitor.totalScore)}
                                </div>
                                <div className="competitor-item-date">
                                    {formatDate(competitor.submittedAt)}
                                </div>
                                <div className="competitor-item-tricks">
                                    {competitor.scores.length} trick{competitor.scores.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );
};

export default SavedCompetitorsTab;