import React, { useState } from 'react';
import { SavedCompetitor } from './types';
import { goeLevels, performanceCategories } from './constants';
import { formatScore, formatDate, csvEscape, downloadFile, calculateAdjustedScore, getHighestTechnicalScore } from './utils';

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

    // Calculate highest technical score for adjusted score calculation
    const highestTechnicalScore = getHighestTechnicalScore(savedCompetitors);

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

    const buildIndividualCsv = (competitor: SavedCompetitor) => {
        const rows: (string | number)[][] = [];

        rows.push(['Competitor', competitor.name]);
        rows.push(['Judge', competitor.judgeName || 'Unknown']);
        rows.push(['Judge Category', competitor.judgeCategory.charAt(0).toUpperCase() + competitor.judgeCategory.slice(1)]);
        rows.push(['Submitted At', formatDate(competitor.submittedAt)]);
        rows.push([]);

        if (competitor.judgeCategory === 'technical') {
            // Technical scores
            if (competitor.scores.length > 0) {
                rows.push(['TECHNICAL SCORES']);
                rows.push(['#', 'Identifier', 'Trick', 'Difficulty', 'Base', 'Features', 'Execution', 'Level', 'Final']);
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
                rows.push(['Technical Total', '', '', '', '', '', '', '', formatScore(competitor.totalScore)]);

                // Add adjusted score for technical competitors
                const adjustedScore = calculateAdjustedScore(competitor.totalScore, highestTechnicalScore);
                rows.push(['Adjusted Score (Competition Scale)', '', '', '', '', '', '', '', formatScore(adjustedScore)]);
            }
        } else {
            // Performance scores
            if (competitor.performanceScores && Object.values(competitor.performanceScores).some(score => score > 0)) {
                rows.push(['PERFORMANCE SCORES']);
                rows.push(['Category', 'Score', 'Out of 5', 'Description']);
                performanceCategories.forEach(category => {
                    const score = competitor.performanceScores?.[category.key] || 0;
                    rows.push([category.name, formatScore(score), '5.0', category.description]);
                });
                rows.push([]);
                rows.push(['Performance Total', formatScore(competitor.totalPerformanceScore || 0), '30.0', '']);
            }
        }

        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildIndividualTxt = (competitor: SavedCompetitor) => {
        let txt = `Competitor: ${competitor.name}\n`;
        txt += `Judge: ${competitor.judgeName || 'Unknown'} (${competitor.judgeCategory.charAt(0).toUpperCase() + competitor.judgeCategory.slice(1)})\n`;
        txt += `Submitted: ${formatDate(competitor.submittedAt)}\n\n`;

        if (competitor.judgeCategory === 'technical') {
            txt += `Technical Total: ${formatScore(competitor.totalScore)}\n`;

            // Add adjusted score for technical competitors
            const adjustedScore = calculateAdjustedScore(competitor.totalScore, highestTechnicalScore);
            txt += `Adjusted Score (Competition Scale): ${formatScore(adjustedScore)}\n\n`;

            if (competitor.scores.length > 0) {
                txt += 'TECHNICAL SCORES\n';
                txt += `#  Identifier     | Trick (Diff)                | Base  | Features      | Exec| Level| Final\n`;
                txt += `--------------------------------------------------------------------------------------------\n`;

                competitor.scores.forEach((score, scoreIndex) => {
                    const line =
                        `${String(scoreIndex + 1).padEnd(3)}` +
                        `${score.identifier.padEnd(15)}| ` +
                        `${`${score.trick} (${score.difficulty})`.padEnd(25)}| ` +
                        `${String(score.baseScore).padEnd(5)} | ` +
                        `${score.features.map(f => f.abbrev).join(', ').padEnd(13)}| ` +
                        `${(score.goeLevel >= 0 ? `+${score.goeLevel}` : score.goeLevel).toString().padEnd(4)}| ` +
                        `${(score.multiplierLevel ?? '').toString().padEnd(5)}| ` +
                        `${formatScore(score.finalScore)}`;
                    txt += line + '\n';
                });
            }
        } else {
            txt += `Performance Total: ${formatScore(competitor.totalPerformanceScore || 0)}/30.0\n\n`;

            if (competitor.performanceScores && Object.values(competitor.performanceScores).some(score => score > 0)) {
                txt += 'PERFORMANCE SCORES\n';
                txt += `Category          | Score | Out of | Description\n`;
                txt += `------------------------------------------------------------\n`;

                performanceCategories.forEach(category => {
                    const score = competitor.performanceScores?.[category.key] || 0;
                    const line = `${category.name.padEnd(17)}| ${formatScore(score).padEnd(5)} | 5.0    | ${category.description}`;
                    txt += line + '\n';
                });
            }
        }

        return txt;
    };

    const onExportSelectedCsv = () => {
        const selected = getSelectedCompetitors();
        if (selected.length === 0) return;

        if (selected.length === 1) {
            const competitor = selected[0];
            const filename = `${competitor.name}_${competitor.judgeCategory}.csv`;
            const content = buildIndividualCsv(competitor);
            downloadFile(filename, content, 'text/csv;charset=utf-8');
        } else {
            // Multiple competitors - build combined export
            const filename = `${selected.length}_competitors.csv`;
            let content = 'Multiple Competitors Export\n\n';

            selected.forEach((competitor, index) => {
                if (index > 0) content += '\n' + '='.repeat(50) + '\n\n';
                content += buildIndividualCsv(competitor);
            });

            downloadFile(filename, content, 'text/csv;charset=utf-8');
        }
    };

    const onExportSelectedTxt = () => {
        const selected = getSelectedCompetitors();
        if (selected.length === 0) return;

        if (selected.length === 1) {
            const competitor = selected[0];
            const filename = `${competitor.name}_${competitor.judgeCategory}.txt`;
            const content = buildIndividualTxt(competitor);
            downloadFile(filename, content, 'text/plain;charset=utf-8');
        } else {
            // Multiple competitors - build combined export
            const filename = `${selected.length}_competitors.txt`;
            let content = `Multiple Competitors Export - ${selected.length} Competitors\n\n`;

            selected.forEach((competitor, index) => {
                if (index > 0) content += '\n' + '='.repeat(80) + '\n\n';
                content += buildIndividualTxt(competitor);
            });

            downloadFile(filename, content, 'text/plain;charset=utf-8');
        }
    };

    return (
        <>
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
                            {selectedCompetitorDetails.judgeCategory === 'technical' ? (
                                isAdmin ? (
                                    <>
                                        Technical: {formatScore(selectedCompetitorDetails.totalScore)}
                                        <br />
                                        Adjusted: {formatScore(calculateAdjustedScore(selectedCompetitorDetails.totalScore, highestTechnicalScore))}
                                    </>
                                ) : (
                                    'Technical: ***'
                                )
                            ) : (
                                `Performance: ${formatScore(selectedCompetitorDetails.totalPerformanceScore || 0)}/30.0`
                            )}
                        </div>
                    </div>

                    <div className="competitor-name">
                        Judge: {selectedCompetitorDetails.judgeName || 'Unknown'} ({selectedCompetitorDetails.judgeCategory.charAt(0).toUpperCase() + selectedCompetitorDetails.judgeCategory.slice(1)}) | Submitted: {formatDate(selectedCompetitorDetails.submittedAt)}
                    </div>

                    {/* Technical Scores */}
                    {selectedCompetitorDetails.judgeCategory === 'technical' && selectedCompetitorDetails.scores.length > 0 && (
                        <>
                            <div className="section-title" style={{ marginTop: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                                Technical Scores ({isAdmin ? formatScore(selectedCompetitorDetails.totalScore) : '***'})
                                {isAdmin && (
                                    <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal', marginTop: '4px' }}>
                                        Adjusted Score (Competition Scale): {formatScore(calculateAdjustedScore(selectedCompetitorDetails.totalScore, highestTechnicalScore))}
                                    </div>
                                )}
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
                                                        ${score.goeLevel !== 0 ? ` × Execution: ${goeLevels[score.goeLevel]}` : ''}
                                                        ${score.multiplierLevel ? ` × Level ${score.multiplierLevel}` : ''}`
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
                                <div className="selected-features">
                                    {selectedCompetitorDetails.scores.length} technical score{selectedCompetitorDetails.scores.length !== 1 ? 's' : ''} recorded. Admin access required for detailed breakdown.
                                </div>
                            )}
                        </>
                    )}

                    {/* Performance Scores */}
                    {selectedCompetitorDetails.judgeCategory === 'performance' && selectedCompetitorDetails.performanceScores && Object.values(selectedCompetitorDetails.performanceScores).some(score => score > 0) && (
                        <>
                            <div className="section-title" style={{ marginTop: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                                Performance Scores ({formatScore(selectedCompetitorDetails.totalPerformanceScore || 0)}/30.0)
                            </div>
                            <div className="details-list">
                                {performanceCategories.map((category) => {
                                    const score = selectedCompetitorDetails.performanceScores?.[category.key] || 0;
                                    return (
                                        <div key={category.key} className="detail-item">
                                            <div>
                                                <div className="detail-identifier">{category.name}</div>
                                                <div className="detail-breakdown">{category.description}</div>
                                            </div>
                                            <div className="detail-score">
                                                <div className="detail-points">{formatScore(score)}/5.0</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </>
            ) : (
                <>
                    {savedCompetitors.length > 0 && isAdmin && (
                        <>
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
                                No competitors saved yet. Complete scoring and save from the Technical or Performance tabs to save competitors here.
                            </div>
                        ) : (
                            // Reverse the order to show newest competitors first
                            savedCompetitors.slice().reverse().map((competitor) => {
                                const adjustedScore = competitor.judgeCategory === 'technical'
                                    ? calculateAdjustedScore(competitor.totalScore, highestTechnicalScore)
                                    : 0;

                                return (
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
                                                {isAdmin && (
                                                    <>
                                                        <button
                                                            className="edit-competitor"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const filename = `${competitor.name}_${competitor.judgeCategory}.csv`;
                                                                const content = buildIndividualCsv(competitor);
                                                                downloadFile(filename, content, 'text/csv;charset=utf-8');
                                                            }}
                                                            title="Export CSV"
                                                        >
                                                            CSV
                                                        </button>
                                                        <button
                                                            className="edit-competitor"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const filename = `${competitor.name}_${competitor.judgeCategory}.txt`;
                                                                const content = buildIndividualTxt(competitor);
                                                                downloadFile(filename, content, 'text/plain;charset=utf-8');
                                                            }}
                                                            title="Export TXT"
                                                        >
                                                            TXT
                                                        </button>
                                                    </>
                                                )}
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
                                            {competitor.judgeCategory === 'technical' ? (
                                                <>
                                                    Technical Score: {isAdmin ? formatScore(competitor.totalScore) : '***'}
                                                    {isAdmin && (
                                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                            Adjusted Score: {formatScore(adjustedScore)}
                                                        </div>
                                                    )}
                                                    {competitor.judgeName && (
                                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                            Judge: {competitor.judgeName} (Technical)
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    Performance Score: {formatScore(competitor.totalPerformanceScore || 0)}/30.0
                                                    {competitor.judgeName && (
                                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                            Judge: {competitor.judgeName} (Performance)
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
                                            {competitor.judgeCategory === 'technical' ? (
                                                `${competitor.scores.length} technical score${competitor.scores.length !== 1 ? 's' : ''}`
                                            ) : (
                                                `Performance scores (${Object.values(competitor.performanceScores || {}).filter(score => score > 0).length}/6 categories)`
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </>
    );
};

export default SavedCompetitorsTab;