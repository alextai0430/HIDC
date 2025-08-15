import React, { useState } from 'react';
import { SavedCompetitor } from './types';
import { goeLevels } from './constants';
import { formatScore, formatDate, csvEscape, downloadFile } from './utils';

interface SavedCompetitorsTabProps {
    savedCompetitors: SavedCompetitor[];
    selectedCompetitorDetails: SavedCompetitor | null;
    setSelectedCompetitorDetails: (competitor: SavedCompetitor | null) => void;
    loadCompetitorForEditing: (competitor: SavedCompetitor) => void;
    deleteCompetitor: (competitorId: string) => void;
    isAdmin: boolean;
}

const SavedCompetitorsTab: React.FC<SavedCompetitorsTabProps> = ({
                                                                     savedCompetitors,
                                                                     selectedCompetitorDetails,
                                                                     setSelectedCompetitorDetails,
                                                                     loadCompetitorForEditing,
                                                                     deleteCompetitor,
                                                                     isAdmin
                                                                 }) => {
    const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>([]);

    const toggleCompetitorSelection = (competitorId: string) => {
        setSelectedCompetitorIds(prev =>
            prev.includes(competitorId)
                ? prev.filter(id => id !== competitorId)
                : [...prev, competitorId]
        );
    };

    const selectAllCompetitors = () => {
        if (selectedCompetitorIds.length === savedCompetitors.length) {
            setSelectedCompetitorIds([]);
        } else {
            setSelectedCompetitorIds(savedCompetitors.map(comp => comp.id));
        }
    };

    const getSelectedCompetitors = () => {
        return savedCompetitors.filter(comp => selectedCompetitorIds.includes(comp.id));
    };

    const buildCombinedCsv = (competitors: SavedCompetitor[]) => {
        const rows: (string | number)[][] = [];

        // Header
        rows.push(['Combined Export - ' + competitors.length + ' Competitors']);
        rows.push([]);

        competitors.forEach((competitor, compIndex) => {
            if (compIndex > 0) {
                rows.push([]); // Empty row between competitors
            }

            rows.push(['Competitor', competitor.name]);
            rows.push(['Judge', competitor.judgeName || 'Unknown']);
            rows.push(['Total Score', formatScore(competitor.totalScore)]);
            rows.push(['Submitted At', formatDate(competitor.submittedAt)]);
            rows.push([]);
            rows.push(['#', 'Identifier', 'Trick', 'Difficulty', 'Base', 'Features', 'GOE', 'Multiplier Level', 'Final']);

            competitor.scores.forEach((score, scoreIndex) => {
                rows.push([
                    scoreIndex + 1,
                    score.identifier,
                    score.trick,
                    score.difficulty,
                    score.baseScore,
                    score.features.map(f => f.abbrev).join(', '),
                    score.goeLevel >= 0 ? `+${score.goeLevel}` : `${score.goeLevel}`,
                    score.multiplierLevel ?? '',
                    formatScore(score.finalScore)
                ]);
            });

            rows.push([]);
            rows.push(['Total', '', '', '', '', '', '', '', formatScore(competitor.totalScore)]);
        });

        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildCombinedTxt = (competitors: SavedCompetitor[]) => {
        let txt = `Combined Export - ${competitors.length} Competitors\n\n`;

        competitors.forEach((competitor, compIndex) => {
            if (compIndex > 0) {
                txt += '\n' + '='.repeat(80) + '\n\n';
            }

            txt += `Competitor: ${competitor.name}\n`;
            txt += `Judge: ${competitor.judgeName || 'Unknown'}\n`;
            txt += `Total: ${formatScore(competitor.totalScore)}\n`;
            txt += `Submitted: ${formatDate(competitor.submittedAt)}\n\n`;
            txt += `#  Identifier     | Trick (Diff)                | Base  | Features      | GOE | Mult | Final\n`;
            txt += `--------------------------------------------------------------------------------------------\n`;

            competitor.scores.forEach((score, scoreIndex) => {
                const line =
                    `${String(scoreIndex + 1).padEnd(3)}` +
                    `${score.identifier.padEnd(15)}| ` +
                    `${`${score.trick} (${score.difficulty})`.padEnd(25)}| ` +
                    `${String(score.baseScore).padEnd(5)} | ` +
                    `${score.features.map(f => f.abbrev).join(', ').padEnd(13)}| ` +
                    `${(score.goeLevel >= 0 ? `+${score.goeLevel}` : score.goeLevel).toString().padEnd(3)} | ` +
                    `${(score.multiplierLevel ?? '').toString().padEnd(5)}| ` +
                    `${formatScore(score.finalScore)}`;
                txt += line + '\n';
            });

            txt += `\nTotal: ${formatScore(competitor.totalScore)}\n`;
        });

        return txt;
    };

    const onExportSelectedCsv = () => {
        const selected = getSelectedCompetitors();
        if (selected.length === 0) return;

        const filename = selected.length === 1
            ? `${selected[0].name}.csv`
            : `${selected.length}_competitors.csv`;

        const content = buildCombinedCsv(selected);
        downloadFile(filename, content, 'text/csv;charset=utf-8');
    };

    const onExportSelectedTxt = () => {
        const selected = getSelectedCompetitors();
        if (selected.length === 0) return;

        const filename = selected.length === 1
            ? `${selected[0].name}.txt`
            : `${selected.length}_competitors.txt`;

        const content = buildCombinedTxt(selected);
        downloadFile(filename, content, 'text/plain;charset=utf-8');
    };

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
                        <div className="details-total">
                            {isAdmin ? (
                                `Total: ${formatScore(selectedCompetitorDetails.totalScore)}`
                            ) : (
                                'Total: ***'
                            )}
                        </div>
                    </div>

                    <div className="competitor-name">
                        Judge: {selectedCompetitorDetails.judgeName || 'Unknown'} | Submitted: {formatDate(selectedCompetitorDetails.submittedAt)}
                    </div>

                    {isAdmin ? (
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
                    ) : (
                        <div className="no-scores">
                            Score details require admin access. You can still edit or delete this competitor.
                        </div>
                    )}
                </>
            ) : (
                <>
                    {savedCompetitors.length > 0 && isAdmin && (
                        <>
                            {/* Selection Controls - Only for admin */}
                            <div className="section">
                                <div className="button-row">
                                    <button
                                        onClick={selectAllCompetitors}
                                        className="level-button"
                                    >
                                        {selectedCompetitorIds.length === savedCompetitors.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    {selectedCompetitorIds.length > 0 && (
                                        <span className="selected-features">
                                            {selectedCompetitorIds.length} selected
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Export Controls - Only for admin */}
                            {selectedCompetitorIds.length > 0 && (
                                <div className="section">
                                    <div className="section-title">Export Selected Competitors:</div>
                                    <div className="button-row">
                                        <button
                                            onClick={onExportSelectedCsv}
                                            className="feature-button feature-active"
                                        >
                                            Export Detailed CSV ({selectedCompetitorIds.length})
                                        </button>
                                        <button
                                            onClick={onExportSelectedTxt}
                                            className="feature-button feature-active"
                                        >
                                            Export Detailed TXT ({selectedCompetitorIds.length})
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="competitor-list">
                        {savedCompetitors.length === 0 ? (
                            <div className="no-competitors">
                                No competitors saved yet. Complete scoring and {isAdmin ? 'submit from the Export/Submit tab' : 'save from the Scoring tab'} to save competitors here.
                            </div>
                        ) : (
                            savedCompetitors.map((competitor) => (
                                <div
                                    key={competitor.id}
                                    className={`competitor-item ${isAdmin && selectedCompetitorIds.includes(competitor.id) ? 'competitor-selected' : ''}`}
                                >
                                    <div className="competitor-item-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {isAdmin && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCompetitorIds.includes(competitor.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleCompetitorSelection(competitor.id);
                                                    }}
                                                    className="competitor-checkbox"
                                                />
                                            )}
                                            <h3
                                                className="competitor-item-name clickable"
                                                onClick={() => setSelectedCompetitorDetails(competitor)}
                                            >
                                                {competitor.name}
                                            </h3>
                                        </div>
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
                                    <div className="competitor-item-score clickable"
                                         onClick={() => setSelectedCompetitorDetails(competitor)}
                                    >
                                        {isAdmin ? (
                                            <>
                                                Total Score: {formatScore(competitor.totalScore)}
                                                {competitor.judgeName && (
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                        Judge: {competitor.judgeName}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                Total Score: ***
                                                {competitor.judgeName && (
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                        Judge: {competitor.judgeName}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div
                                        className="competitor-item-date clickable"
                                        onClick={() => setSelectedCompetitorDetails(competitor)}
                                    >
                                        {formatDate(competitor.submittedAt)}
                                    </div>
                                    <div
                                        className="competitor-item-tricks clickable"
                                        onClick={() => setSelectedCompetitorDetails(competitor)}
                                    >
                                        {competitor.scores.length} trick{competitor.scores.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </>
    );
};

export default SavedCompetitorsTab;