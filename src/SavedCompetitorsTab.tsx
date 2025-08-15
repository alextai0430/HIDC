import React, { useState } from 'react';
import { SavedCompetitor } from './types';
import { goeLevels, performanceCategories } from './constants';
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
        setSelectedCompetitorIds(
            selectedCompetitorIds.length === savedCompetitors.length
                ? []
                : savedCompetitors.map(comp => comp.id)
        );
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
                rows.push(['Technical Total', '', '', '', '', '', '', '', competitor.isDisqualified ? 'DQ' : formatScore(competitor.totalScore)]);
            }
        } else {
            // Performance scores - always show all categories, even if all scores are 0
            rows.push(['PERFORMANCE SCORES']);
            rows.push(['Category', 'Score', 'Out of 5', 'Description']);
            performanceCategories.forEach(category => {
                const score = competitor.isDisqualified ? 'DQ' : (competitor.performanceScores?.[category.key] || 0);
                const displayScore = competitor.isDisqualified ? 'DQ' : formatScore(score as number);
                rows.push([category.name, displayScore, '5.0', category.description]);
            });
            rows.push([]);
            const totalScore = competitor.isDisqualified ? 'DQ' : formatScore(competitor.totalPerformanceScore || 0);
            rows.push(['Performance Total', totalScore, '30.0', '']);
        }

        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildIndividualTxt = (competitor: SavedCompetitor) => {
        let txt = `Competitor: ${competitor.name}\n`;
        txt += `Judge: ${competitor.judgeName || 'Unknown'} (${competitor.judgeCategory.charAt(0).toUpperCase() + competitor.judgeCategory.slice(1)})\n`;
        txt += `Submitted: ${formatDate(competitor.submittedAt)}\n\n`;

        if (competitor.judgeCategory === 'technical') {
            txt += `Technical Total: ${competitor.isDisqualified ? 'DQ' : formatScore(competitor.totalScore)}\n\n`;

            if (competitor.scores.length > 0) {
                txt += 'TECHNICAL SCORES\n';

                // Define column widths for better alignment
                const colWidths = {
                    num: 3,      // #
                    identifier: 12, // Identifier
                    trick: 25,   // Trick (Diff)
                    base: 6,     // Base
                    features: 12, // Features
                    exec: 5,     // Exec
                    level: 6,    // Level
                    final: 8     // Final
                };

                // Helper function to pad text to column width
                const padColumn = (text: string, width: number, align: 'left' | 'right' = 'left'): string => {
                    const str = String(text || '');
                    if (str.length >= width) return str.substring(0, width);
                    const padding = width - str.length;
                    return align === 'right' ? ' '.repeat(padding) + str : str + ' '.repeat(padding);
                };

                // Create header
                const header =
                    padColumn('#', colWidths.num) + '| ' +
                    padColumn('Identifier', colWidths.identifier) + '| ' +
                    padColumn('Trick (Difficulty)', colWidths.trick) + '| ' +
                    padColumn('Base', colWidths.base, 'right') + '| ' +
                    padColumn('Features', colWidths.features) + '| ' +
                    padColumn('Exec', colWidths.exec) + '| ' +
                    padColumn('Level', colWidths.level) + '| ' +
                    padColumn('Final', colWidths.final, 'right');

                txt += header + '\n';

                // Calculate total width for separator
                const totalWidth = Object.values(colWidths).reduce((sum, width) => sum + width, 0) +
                    (Object.keys(colWidths).length - 1) * 2; // Account for separators
                txt += '-'.repeat(totalWidth) + '\n';

                competitor.scores.forEach((score, scoreIndex) => {
                    const trickDisplay = `${score.trick} (${score.difficulty})`;
                    const featuresDisplay = score.features.map(f => f.abbrev).join(', ');
                    const execDisplay = score.goeLevel >= 0 ? `+${score.goeLevel}` : `${score.goeLevel}`;
                    const levelDisplay = score.multiplierLevel?.toString() || '';

                    const line =
                        padColumn((scoreIndex + 1).toString(), colWidths.num) + '| ' +
                        padColumn(score.identifier, colWidths.identifier) + '| ' +
                        padColumn(trickDisplay, colWidths.trick) + '| ' +
                        padColumn(formatScore(score.baseScore), colWidths.base, 'right') + '| ' +
                        padColumn(featuresDisplay, colWidths.features) + '| ' +
                        padColumn(execDisplay, colWidths.exec) + '| ' +
                        padColumn(levelDisplay, colWidths.level) + '| ' +
                        padColumn(formatScore(score.finalScore), colWidths.final, 'right');

                    txt += line + '\n';
                });
            }
        } else {
            // Performance scores
            txt += `Performance Total: ${competitor.isDisqualified ? 'DQ' : formatScore(competitor.totalPerformanceScore || 0)}/30.0\n\n`;

            txt += 'PERFORMANCE SCORES\n';

            // Define column widths for performance scores
            const colWidths = {
                category: 18,    // Category name
                score: 6,        // Score value
                outOf: 8,        // "Out of 5"
                description: 45  // Description
            };

            // Helper function to pad text to column width
            const padColumn = (text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string => {
                const str = String(text || '');
                if (str.length >= width) return str.substring(0, width);
                const padding = width - str.length;
                switch (align) {
                    case 'right': return ' '.repeat(padding) + str;
                    case 'center':
                        const leftPad = Math.floor(padding / 2);
                        const rightPad = padding - leftPad;
                        return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
                    default: return str + ' '.repeat(padding);
                }
            };

            // Create header
            const header =
                padColumn('Category', colWidths.category) + '| ' +
                padColumn('Score', colWidths.score, 'right') + '| ' +
                padColumn('Out of', colWidths.outOf, 'center') + '| ' +
                padColumn('Description', colWidths.description);

            txt += header + '\n';

            // Calculate total width for separator
            const totalWidth = Object.values(colWidths).reduce((sum, width) => sum + width, 0) +
                (Object.keys(colWidths).length - 1) * 2;
            txt += '-'.repeat(totalWidth) + '\n';

            performanceCategories.forEach(category => {
                const score = competitor.isDisqualified ? 'DQ' : (competitor.performanceScores?.[category.key] || 0);
                const displayScore = competitor.isDisqualified ? 'DQ' : formatScore(score as number);

                const line =
                    padColumn(category.name, colWidths.category) + '| ' +
                    padColumn(displayScore, colWidths.score, 'right') + '| ' +
                    padColumn('5.0', colWidths.outOf, 'center') + '| ' +
                    padColumn(category.description, colWidths.description);

                txt += line + '\n';
            });
        }

        return txt;
    };

    const exportSelected = (format: 'csv' | 'txt') => {
        const selected = getSelectedCompetitors();
        if (selected.length === 0) return;

        const buildContent = format === 'csv' ? buildIndividualCsv : buildIndividualTxt;
        const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';

        if (selected.length === 1) {
            const competitor = selected[0];
            const filename = `${competitor.name}_${competitor.judgeCategory}.${format}`;
            downloadFile(filename, buildContent(competitor), mimeType);
        } else {
            const filename = `${selected.length}_competitors.${format}`;
            const separator = format === 'csv' ? '='.repeat(50) : '='.repeat(80);
            const header = format === 'csv' ? 'Multiple Competitors Export\n\n' : `Multiple Competitors Export - ${selected.length} Competitors\n\n`;

            const content = header + selected.map(buildContent).join(`\n${separator}\n\n`);
            downloadFile(filename, content, mimeType);
        }
    };

    const deleteSelected = () => {
        const selected = getSelectedCompetitors();
        if (selected.length === 0) return;

        const confirmMessage = selected.length === 1
            ? `Are you sure you want to delete "${selected[0].name}"?`
            : `Are you sure you want to delete ${selected.length} competitors?`;

        if (window.confirm(confirmMessage)) {
            selected.forEach(competitor => deleteCompetitor(competitor.id));
            setSelectedCompetitorIds([]);
        }
    };

    const renderCompetitorScore = (competitor: SavedCompetitor) => {
        const isTechnical = competitor.judgeCategory === 'technical';
        const scoreValue = isTechnical ? competitor.totalScore : competitor.totalPerformanceScore || 0;
        const maxScore = isTechnical ? '' : '/30.0';
        const scoreType = isTechnical ? 'Technical' : 'Performance';

        const displayScore = competitor.isDisqualified ? 'DQ' : (
            isTechnical && !isAdmin ? '***' : formatScore(scoreValue) + maxScore
        );

        return (
            <div style={competitor.isDisqualified ? { color: '#dc2626' } : {}}>
                {scoreType} Score: {displayScore}
                {competitor.judgeName && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        Judge: {competitor.judgeName} ({isTechnical ? 'Technical' : 'Performance'})
                    </div>
                )}
            </div>
        );
    };

    if (selectedCompetitorDetails) {
        const competitor = selectedCompetitorDetails;
        const isTechnical = competitor.judgeCategory === 'technical';

        return (
            <>
                <div className="details-header">
                    <h2 className="details-title">Saved Competitors</h2>
                    <div className="details-total">{savedCompetitors.length} competitors</div>
                </div>

                <div className="section">
                    <button onClick={() => setSelectedCompetitorDetails(null)} className="level-button">
                        ← Back to competitors list
                    </button>
                </div>

                <div className="details-header">
                    <h2 className="details-title">{competitor.name}</h2>
                    <div className="details-total">
                        {isTechnical ? (
                            isAdmin ? (
                                `Technical: ${competitor.isDisqualified ? 'DQ' : formatScore(competitor.totalScore)}`
                            ) : (
                                competitor.isDisqualified ? 'Technical: DQ' : 'Technical: ***'
                            )
                        ) : (
                            `Performance: ${competitor.isDisqualified ? 'DQ' : formatScore(competitor.totalPerformanceScore || 0) + '/30.0'}`
                        )}
                    </div>
                </div>

                <div className="competitor-name">
                    Judge: {competitor.judgeName || 'Unknown'} ({competitor.judgeCategory.charAt(0).toUpperCase() + competitor.judgeCategory.slice(1)}) | Submitted: {formatDate(competitor.submittedAt)}
                    {competitor.isDisqualified && <span style={{ color: '#dc2626', fontWeight: 'bold', marginLeft: '8px' }}>- DISQUALIFIED</span>}
                </div>

                {/* Technical Scores */}
                {isTechnical && competitor.scores.length > 0 && (
                    <>
                        <div className="section-title" style={{ marginTop: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                            Technical Scores ({competitor.isDisqualified ? 'DQ' : (isAdmin ? formatScore(competitor.totalScore) : '***')})
                        </div>
                        {isAdmin ? (
                            <div className="details-list">
                                {competitor.scores.map((score, index) => (
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
                                {competitor.scores.length} technical score{competitor.scores.length !== 1 ? 's' : ''} recorded. Admin access required for detailed breakdown.
                            </div>
                        )}
                    </>
                )}

                {/* Performance Scores */}
                {!isTechnical && (
                    <>
                        <div className="section-title" style={{ marginTop: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                            Performance Scores ({competitor.isDisqualified ? 'DQ' : formatScore(competitor.totalPerformanceScore || 0) + '/30.0'})
                        </div>
                        <div className="details-list">
                            {performanceCategories.map((category) => {
                                const score = competitor.isDisqualified ? 0 : (competitor.performanceScores?.[category.key] || 0);
                                const displayScore = competitor.isDisqualified ? 'DQ' : formatScore(score) + '/5.0';
                                return (
                                    <div key={category.key} className={`detail-item ${competitor.isDisqualified ? 'deduction-item-detail' : ''}`}>
                                        <div>
                                            <div className="detail-identifier">{category.name}</div>
                                            <div className="detail-breakdown">{category.description}</div>
                                        </div>
                                        <div className="detail-score">
                                            <div className={`detail-points ${competitor.isDisqualified ? 'deduction-points' : ''}`}>
                                                {displayScore}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </>
        );
    }

    return (
        <>
            <div className="details-header">
                <h2 className="details-title">Saved Competitors</h2>
                <div className="details-total">{savedCompetitors.length} competitors</div>
            </div>

            {savedCompetitors.length > 0 && isAdmin && (
                <>
                    <div className="section">
                        <div className="button-row">
                            <button onClick={selectAllCompetitors} className="level-button">
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
                            <div className="section-title">Actions for Selected Competitors:</div>
                            <div className="button-row">
                                <button onClick={() => exportSelected('csv')} className="feature-button feature-active">
                                    Export Detailed CSV ({selectedCompetitorIds.length})
                                </button>
                                <button onClick={() => exportSelected('txt')} className="feature-button feature-active">
                                    Export Detailed TXT ({selectedCompetitorIds.length})
                                </button>
                                <button onClick={deleteSelected} className="feature-button" style={{ backgroundColor: '#dc2626', color: 'white' }}>
                                    Delete Selected ({selectedCompetitorIds.length})
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
                    savedCompetitors.slice().reverse().map((competitor) => (
                        <div
                            key={competitor.id}
                            className={`competitor-item ${isAdmin && selectedCompetitorIds.includes(competitor.id) ? 'competitor-selected' : ''} ${competitor.isDisqualified ? 'score-disqualified' : ''}`}
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
                                        style={competitor.isDisqualified ? { color: '#dc2626' } : {}}
                                    >
                                        {competitor.name} {competitor.isDisqualified && '(DQ)'}
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
                            <div className="competitor-item-score clickable" onClick={() => setSelectedCompetitorDetails(competitor)}>
                                {renderCompetitorScore(competitor)}
                            </div>
                            <div className="competitor-item-date clickable" onClick={() => setSelectedCompetitorDetails(competitor)}>
                                {formatDate(competitor.submittedAt)}
                            </div>
                            <div className="competitor-item-tricks clickable" onClick={() => setSelectedCompetitorDetails(competitor)}>
                                {competitor.judgeCategory === 'technical' ? (
                                    `${competitor.scores.length} technical score${competitor.scores.length !== 1 ? 's' : ''}`
                                ) : (
                                    `Performance scores (${Object.values(competitor.performanceScores || {}).filter(score => score > 0).length}/6 categories)`
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

export default SavedCompetitorsTab;