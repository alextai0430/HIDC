import React, {useState, useEffect} from 'react';
import {SavedCompetitor} from './types';
import {formatScore, csvEscape, downloadFile, formatDate} from './utils';

interface FinalRankingsTabProps {
    savedCompetitors: SavedCompetitor[];
}

interface CompetitorScores {
    name: string;
    technicalScores: [number, number, number]; // 3 technical judges
    performanceScores: [number, number]; // 2 performance judges
    normalizedTechnical: number;
    averagePerformance: number;
    finalScore: number;
    isDisqualified: boolean;
}

interface JudgeAssignment {
    competitorName: string;
    tech1: number;
    tech2: number;
    tech3: number;
    perf1: number;
    perf2: number;
    isDisqualified: boolean;
}

const FinalRankingsTab: React.FC<FinalRankingsTabProps> = ({savedCompetitors}) => {
    const [judgeAssignments, setJudgeAssignments] = useState<JudgeAssignment[]>([]);
    const [finalRankings, setFinalRankings] = useState<CompetitorScores[]>([]);
    const [highestTechnicalTotal, setHighestTechnicalTotal] = useState<number>(0);
    const [viewMode, setViewMode] = useState<'final' | 'technical' | 'performance' | 'tech1' | 'tech2' | 'tech3' | 'perf1' | 'perf2'>('final');
    const [exportOrder, setExportOrder] = useState<'ranking' | 'input'>('ranking');

    // Get unique competitor names from saved competitors
    const uniqueCompetitorNames = Array.from(new Set(savedCompetitors.map(comp => comp.name)));

    // Initialize empty judge assignments - no auto-fill
    useEffect(() => {
        // Only initialize if empty - don't auto-fill from saved competitors
        if (judgeAssignments.length === 0) {
            setJudgeAssignments([]);
        }
    }, []);

    // Calculate final rankings whenever assignments change
    useEffect(() => {
        if (judgeAssignments.length === 0) return;

        // Calculate highest technical total (sum of all 3 technical scores)
        const highestTech = Math.max(...judgeAssignments.map(assignment =>
            assignment.isDisqualified ? 0 : (assignment.tech1 + assignment.tech2 + assignment.tech3)
        ));
        setHighestTechnicalTotal(highestTech);

        // Calculate final scores for each competitor
        const rankings: CompetitorScores[] = judgeAssignments.map(assignment => {
            if (assignment.isDisqualified) {
                return {
                    name: assignment.competitorName,
                    technicalScores: [0, 0, 0],
                    performanceScores: [0, 0],
                    normalizedTechnical: 0,
                    averagePerformance: 0,
                    finalScore: 0,
                    isDisqualified: true
                };
            }

            const technicalTotal = assignment.tech1 + assignment.tech2 + assignment.tech3;
            const normalizedTechnical = highestTech > 0 ? (technicalTotal / highestTech) * 70 : 0;
            const averagePerformance = (assignment.perf1 + assignment.perf2) / 2;
            const finalScore = normalizedTechnical + averagePerformance;

            return {
                name: assignment.competitorName,
                technicalScores: [assignment.tech1, assignment.tech2, assignment.tech3],
                performanceScores: [assignment.perf1, assignment.perf2],
                normalizedTechnical,
                averagePerformance,
                finalScore,
                isDisqualified: false
            };
        });

        setFinalRankings(rankings);
    }, [judgeAssignments]);

    const updateAssignment = (competitorName: string, field: keyof Omit<JudgeAssignment, 'competitorName'>, value: number | boolean) => {
        setJudgeAssignments(prev => prev.map(assignment =>
            assignment.competitorName === competitorName
                ? {...assignment, [field]: value}
                : assignment
        ));
    };

    const addCompetitor = () => {
        const name = prompt('Enter competitor name:');
        if (name && name.trim() && !judgeAssignments.find(a => a.competitorName === name.trim())) {
            setJudgeAssignments(prev => [...prev, {
                competitorName: name.trim(),
                tech1: 0,
                tech2: 0,
                tech3: 0,
                perf1: 0,
                perf2: 0,
                isDisqualified: false
            }]);
        }
    };

    const removeCompetitor = (competitorName: string) => {
        if (window.confirm(`Remove ${competitorName} from final rankings?`)) {
            setJudgeAssignments(prev => prev.filter(a => a.competitorName !== competitorName));
        }
    };

    const clearAllScores = () => {
        if (window.confirm('Clear all scores? This will reset all judge assignments to 0.')) {
            setJudgeAssignments(prev => prev.map(assignment => ({
                ...assignment,
                tech1: 0,
                tech2: 0,
                tech3: 0,
                perf1: 0,
                perf2: 0,
                isDisqualified: false
            })));
        }
    };

    const getSortedRankings = (forExport: boolean = false) => {
        if (finalRankings.length === 0) return [];

        let sortedRankings = [...finalRankings];

        // If exporting in input order, maintain the original input order
        if (forExport && exportOrder === 'input') {
            // Keep the order as it was entered (judgeAssignments order)
            sortedRankings = judgeAssignments.map(assignment => {
                const competitor = finalRankings.find(fr => fr.name === assignment.competitorName);
                return competitor!;
            }).filter(Boolean);
            return sortedRankings;
        }

        // Otherwise sort by the selected ranking criteria
        switch (viewMode) {
            case 'final':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    return b.finalScore - a.finalScore;
                });
                break;
            case 'technical':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    const aTechTotal = a.technicalScores.reduce((sum, score) => sum + score, 0);
                    const bTechTotal = b.technicalScores.reduce((sum, score) => sum + score, 0);
                    const aNormalizedTech = highestTechnicalTotal > 0 ? (aTechTotal / highestTechnicalTotal) * 70 : 0;
                    const bNormalizedTech = highestTechnicalTotal > 0 ? (bTechTotal / highestTechnicalTotal) * 70 : 0;
                    return bNormalizedTech - aNormalizedTech;
                });
                break;
            case 'performance':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    return b.averagePerformance - a.averagePerformance;
                });
                break;
            case 'tech1':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    return b.technicalScores[0] - a.technicalScores[0];
                });
                break;
            case 'tech2':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    return b.technicalScores[1] - a.technicalScores[1];
                });
                break;
            case 'tech3':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    return b.technicalScores[2] - a.technicalScores[2];
                });
                break;
            case 'perf1':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    return b.performanceScores[0] - a.performanceScores[0];
                });
                break;
            case 'perf2':
                sortedRankings.sort((a, b) => {
                    if (a.isDisqualified && !b.isDisqualified) return 1;
                    if (!a.isDisqualified && b.isDisqualified) return -1;
                    if (a.isDisqualified && b.isDisqualified) return 0;
                    return b.performanceScores[1] - a.performanceScores[1];
                });
                break;
        }

        return sortedRankings;
    };

    const getRankingTitle = () => {
        const baseTitle = (() => {
            switch (viewMode) {
                case 'final':
                    return 'Final Rankings';
                case 'technical':
                    return 'Technical Rankings (Combined)';
                case 'performance':
                    return 'Performance Rankings (Average)';
                case 'tech1':
                    return 'Technical Judge 1 Rankings';
                case 'tech2':
                    return 'Technical Judge 2 Rankings';
                case 'tech3':
                    return 'Technical Judge 3 Rankings';
                case 'perf1':
                    return 'Performance Judge 1 Rankings';
                case 'perf2':
                    return 'Performance Judge 2 Rankings';
                default:
                    return 'Rankings';
            }
        })();

        const orderSuffix = exportOrder === 'input' ? ' (Input Order)' : ' (Ranked Order)';
        return baseTitle + orderSuffix;
    };

    const getScoreDisplay = (competitor: CompetitorScores, index: number, forExport: boolean = false) => {
        // For input order exports, don't show ranking numbers, just show scores
        const rank = (forExport && exportOrder === 'input') ?
            (competitor.isDisqualified ? 'DQ' : '-') :
            (competitor.isDisqualified ? 'DQ' : (index + 1).toString());

        switch (viewMode) {
            case 'final':
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : `${formatScore(competitor.finalScore)}/100`,
                    breakdown: `Tech: ${formatScore(competitor.normalizedTechnical)}/70 | Perf: ${formatScore(competitor.averagePerformance)}/30`
                };
            case 'technical':
                const techTotal = competitor.technicalScores.reduce((sum, score) => sum + score, 0);
                const normalizedTechOnly = highestTechnicalTotal > 0 ? (techTotal / highestTechnicalTotal) * 70 : 0;
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : formatScore(normalizedTechOnly),
                    breakdown: `(${competitor.technicalScores.map(s => formatScore(s)).join(' + ')}) / ${formatScore(highestTechnicalTotal)} × 70`
                };
            case 'performance':
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : formatScore(competitor.averagePerformance),
                    breakdown: `${competitor.performanceScores.map(s => formatScore(s)).join(' + ')} ÷ 2`
                };
            case 'tech1':
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : formatScore(competitor.technicalScores[0]),
                    breakdown: 'Technical Judge 1 Score'
                };
            case 'tech2':
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : formatScore(competitor.technicalScores[1]),
                    breakdown: 'Technical Judge 2 Score'
                };
            case 'tech3':
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : formatScore(competitor.technicalScores[2]),
                    breakdown: 'Technical Judge 3 Score'
                };
            case 'perf1':
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : formatScore(competitor.performanceScores[0]),
                    breakdown: 'Performance Judge 1 Score'
                };
            case 'perf2':
                return {
                    rank,
                    score: competitor.isDisqualified ? 'DQ' : formatScore(competitor.performanceScores[1]),
                    breakdown: 'Performance Judge 2 Score'
                };
            default:
                return {rank, score: '0', breakdown: ''};
        }
    };

    const exportCurrentRankings = (format: 'csv' | 'txt') => {
        if (finalRankings.length === 0) return;

        const sortedRankings = getSortedRankings(true); // Pass true to indicate this is for export
        const baseTitle = (() => {
            switch (viewMode) {
                case 'final':
                    return 'Final Rankings';
                case 'technical':
                    return 'Technical Rankings (Combined)';
                case 'performance':
                    return 'Performance Rankings (Average)';
                case 'tech1':
                    return 'Technical Judge 1 Rankings';
                case 'tech2':
                    return 'Technical Judge 2 Rankings';
                case 'tech3':
                    return 'Technical Judge 3 Rankings';
                case 'perf1':
                    return 'Performance Judge 1 Rankings';
                case 'perf2':
                    return 'Performance Judge 2 Rankings';
                default:
                    return 'Rankings';
            }
        })();

        const orderSuffix = exportOrder === 'input' ? '_input_order' : '_ranked';
        const filename = `${baseTitle.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')}${orderSuffix}.${format}`;
        let content = '';

        if (format === 'csv') {
            const rows: (string | number)[][] = [];
            rows.push([`${baseTitle} - ${exportOrder === 'input' ? 'Input Order' : 'Ranked Order'}`]);
            rows.push([`Generated: ${formatDate(new Date().toISOString())}`]);

            if (viewMode === 'final') {
                rows.push([`Formula: ((Tech1 + Tech2 + Tech3) / ${formatScore(highestTechnicalTotal)}) × 70 + (Perf1 + Perf2) ÷ 2`]);
            } else if (viewMode === 'technical') {
                rows.push([`Formula: ((Tech1 + Tech2 + Tech3) / ${formatScore(highestTechnicalTotal)}) × 70`]);
            } else if (viewMode === 'performance') {
                rows.push([`Formula: (Perf1 + Perf2) ÷ 2`]);
            }

            rows.push([]);

            // Headers based on view mode
            let headers = exportOrder === 'input' ? ['Position', 'Competitor'] : ['Rank', 'Competitor'];
            if (viewMode === 'final') {
                headers = [...headers, 'Tech1', 'Tech2', 'Tech3', 'Tech Total', 'Normalized Tech', 'Perf1', 'Perf2', 'Perf Avg', 'Final Score', 'Status'];
            } else if (viewMode === 'technical') {
                headers = [...headers, 'Tech1', 'Tech2', 'Tech3', 'Tech Total', 'Normalized Score', 'Status'];
            } else if (viewMode === 'performance') {
                headers = [...headers, 'Perf1', 'Perf2', 'Performance Average', 'Status'];
            } else {
                headers = [...headers, 'Score', 'Status'];
            }
            rows.push(headers);

            sortedRankings.forEach((competitor, index) => {
                const position = exportOrder === 'input' ?
                    (competitor.isDisqualified ? 'DQ' : (index + 1).toString()) :
                    (competitor.isDisqualified ? 'DQ' : (index + 1).toString());
                const status = competitor.isDisqualified ? 'Disqualified' : 'Qualified';

                let row: (string | number)[] = [position, competitor.name];

                if (viewMode === 'final') {
                    const techTotal = competitor.technicalScores.reduce((sum, score) => sum + score, 0);
                    row = [...row,
                        formatScore(competitor.technicalScores[0]),
                        formatScore(competitor.technicalScores[1]),
                        formatScore(competitor.technicalScores[2]),
                        formatScore(techTotal),
                        formatScore(competitor.normalizedTechnical),
                        formatScore(competitor.performanceScores[0]),
                        formatScore(competitor.performanceScores[1]),
                        formatScore(competitor.averagePerformance),
                        formatScore(competitor.finalScore),
                        status
                    ];
                } else if (viewMode === 'technical') {
                    const techTotal = competitor.technicalScores.reduce((sum, score) => sum + score, 0);
                    const normalizedTechOnly = highestTechnicalTotal > 0 ? (techTotal / highestTechnicalTotal) * 70 : 0;
                    row = [...row,
                        formatScore(competitor.technicalScores[0]),
                        formatScore(competitor.technicalScores[1]),
                        formatScore(competitor.technicalScores[2]),
                        formatScore(techTotal),
                        formatScore(normalizedTechOnly),
                        status
                    ];
                } else if (viewMode === 'performance') {
                    row = [...row,
                        formatScore(competitor.performanceScores[0]),
                        formatScore(competitor.performanceScores[1]),
                        formatScore(competitor.averagePerformance),
                        status
                    ];
                } else {
                    // Individual judge scores
                    let score = 0;
                    if (viewMode === 'tech1') score = competitor.technicalScores[0];
                    else if (viewMode === 'tech2') score = competitor.technicalScores[1];
                    else if (viewMode === 'tech3') score = competitor.technicalScores[2];
                    else if (viewMode === 'perf1') score = competitor.performanceScores[0];
                    else if (viewMode === 'perf2') score = competitor.performanceScores[1];

                    row = [...row, formatScore(score), status];
                }

                rows.push(row);
            });

            content = rows.map(r => r.map(csvEscape).join(',')).join('\n');
        } else {
            // TXT format
            content = `${baseTitle} - ${exportOrder === 'input' ? 'Input Order' : 'Ranked Order'}\n`;
            content += `Generated: ${formatDate(new Date().toISOString())}\n`;

            if (viewMode === 'final') {
                content += `Formula: ((Tech1 + Tech2 + Tech3) / ${formatScore(highestTechnicalTotal)}) × 70 + (Perf1 + Perf2) ÷ 2\n\n`;
            } else if (viewMode === 'technical') {
                content += `Formula: ((Tech1 + Tech2 + Tech3) / ${formatScore(highestTechnicalTotal)}) × 70\n\n`;
            } else if (viewMode === 'performance') {
                content += `Formula: (Perf1 + Perf2) ÷ 2\n\n`;
            } else {
                content += `Individual Judge Rankings\n\n`;
            }

            // Define column widths based on content type
            const colWidths = {
                pos: 5,           // Position
                competitor: 22,   // Competitor name
                details: 40,      // Score details/breakdown
                final: 12,        // Final score
                status: 6         // Status
            };

            // Helper function to pad text to column width
            const padColumn = (text: string, width: number, align: 'left' | 'right' = 'left'): string => {
                const str = String(text || '');
                if (str.length >= width) return str.substring(0, width);
                const padding = width - str.length;
                return align === 'right' ? ' '.repeat(padding) + str : str + ' '.repeat(padding);
            };

            const positionHeader = exportOrder === 'input' ? 'Pos' : 'Rank';

            // Create header
            const headerRow =
                padColumn(positionHeader, colWidths.pos) + '| ' +
                padColumn('Competitor', colWidths.competitor) + '| ' +
                padColumn('Score Details', colWidths.details) + '| ' +
                padColumn('Final Score', colWidths.final) + '| ' +
                padColumn('Status', colWidths.status);

            content += headerRow + '\n';

            // Calculate total width for separator
            const totalWidth = Object.values(colWidths).reduce((sum, width) => sum + width, 0) +
                (Object.keys(colWidths).length - 1) * 2;
            content += '-'.repeat(totalWidth) + '\n';

            sortedRankings.forEach((competitor, index) => {
                const position = exportOrder === 'input' ?
                    (competitor.isDisqualified ? 'DQ' : (index + 1).toString()) :
                    (competitor.isDisqualified ? 'DQ' : (index + 1).toString());
                const status = competitor.isDisqualified ? 'DQ' : 'OK';
                const displayData = getScoreDisplay(competitor, index, true);

                const line =
                    padColumn(position, colWidths.pos) + '| ' +
                    padColumn(competitor.name, colWidths.competitor) + '| ' +
                    padColumn(displayData.breakdown, colWidths.details) + '| ' +
                    padColumn(displayData.score, colWidths.final, 'right') + '| ' +
                    padColumn(status, colWidths.status);

                content += line + '\n';
            });
        }

        const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
        downloadFile(filename, content, mimeType);
    };

    return (
        <>
            <div className="details-header">
                <h2 className="details-title">Final Rankings (5 Judges)</h2>
                <div className="details-total">{judgeAssignments.length} competitors</div>
            </div>

            {/* Control Buttons */}
            <div className="section">
                <div className="section-title">Management:</div>
                <div className="button-row">
                    <button onClick={addCompetitor} className="feature-button feature-active">
                        Add Competitor
                    </button>
                    <button onClick={clearAllScores} className="feature-button"
                            style={{backgroundColor: '#dc2626', color: 'white'}}>
                        Clear All Scores
                    </button>
                </div>
            </div>


            {/* Formula Explanation */}
            <div className="section">
                <div className="section-title">Scoring Formula:</div>
                <div className="selected-features">
                    <strong>Final Score = ((Tech1 + Tech2 + Tech3) ÷ {formatScore(highestTechnicalTotal)}) × 70 + (Perf1
                        + Perf2) ÷ 2</strong><br/>
                    • Technical scores are normalized to 70 points maximum based on highest total<br/>
                    • Performance scores are averaged (not summed) for fairness<br/>
                    • Maximum possible final score: 100 points (70 technical + 30 performance)<br/>
                    • Disqualified competitors receive 0 points and rank last
                </div>
            </div>

            {/* Score Input Table */}
            <div className="section">
                <div className="section-title">Judge Score Assignments:</div>
                <div style={{overflowX: 'auto'}}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                    }}>
                        <thead>
                        <tr style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
                            <th style={{
                                padding: '12px',
                                textAlign: 'left',
                                fontWeight: 'bold',
                                width: '200px'
                            }}>Competitor
                            </th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Tech
                                1
                            </th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Tech
                                2
                            </th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Tech
                                3
                            </th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Perf
                                1
                            </th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Perf
                                2
                            </th>
                            <th style={{
                                padding: '12px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                width: '60px'
                            }}>DQ
                            </th>
                            <th style={{
                                padding: '12px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                width: '80px'
                            }}>Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {judgeAssignments.map((assignment, index) => (
                            <tr key={assignment.competitorName} style={{borderBottom: '1px solid #e5e7eb'}}>
                                <td style={{padding: '12px', fontWeight: 'bold', width: '200px'}}>
                                    {assignment.competitorName}
                                </td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>
                                    <input
                                        type="text"
                                        value={assignment.tech1}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value) || e.target.value === '') {
                                                updateAssignment(assignment.competitorName, 'tech1', isNaN(value) ? 0 : value);
                                            }
                                        }}
                                        disabled={assignment.isDisqualified}
                                        style={{
                                            width: '80px',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            textAlign: 'center',
                                            backgroundColor: assignment.isDisqualified ? '#f3f4f6' : 'white',
                                            appearance: 'textfield'
                                        }}
                                    />
                                </td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>
                                    <input
                                        type="text"
                                        value={assignment.tech2}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value) || e.target.value === '') {
                                                updateAssignment(assignment.competitorName, 'tech2', isNaN(value) ? 0 : value);
                                            }
                                        }}
                                        disabled={assignment.isDisqualified}
                                        style={{
                                            width: '80px',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            textAlign: 'center',
                                            backgroundColor: assignment.isDisqualified ? '#f3f4f6' : 'white',
                                            appearance: 'textfield'
                                        }}
                                    />
                                </td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>
                                    <input
                                        type="text"
                                        value={assignment.tech3}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value) || e.target.value === '') {
                                                updateAssignment(assignment.competitorName, 'tech3', isNaN(value) ? 0 : value);
                                            }
                                        }}
                                        disabled={assignment.isDisqualified}
                                        style={{
                                            width: '80px',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            textAlign: 'center',
                                            backgroundColor: assignment.isDisqualified ? '#f3f4f6' : 'white',
                                            appearance: 'textfield'
                                        }}
                                    />
                                </td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>
                                    <input
                                        type="text"
                                        value={assignment.perf1}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value) || e.target.value === '') {
                                                updateAssignment(assignment.competitorName, 'perf1', isNaN(value) ? 0 : value);
                                            }
                                        }}
                                        disabled={assignment.isDisqualified}
                                        style={{
                                            width: '80px',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            textAlign: 'center',
                                            backgroundColor: assignment.isDisqualified ? '#f3f4f6' : 'white',
                                            appearance: 'textfield'
                                        }}
                                    />
                                </td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>
                                    <input
                                        type="text"
                                        value={assignment.perf2}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value) || e.target.value === '') {
                                                updateAssignment(assignment.competitorName, 'perf2', isNaN(value) ? 0 : value);
                                            }
                                        }}
                                        disabled={assignment.isDisqualified}
                                        style={{
                                            width: '80px',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            textAlign: 'center',
                                            backgroundColor: assignment.isDisqualified ? '#f3f4f6' : 'white',
                                            appearance: 'textfield'
                                        }}
                                    />
                                </td>
                                <td style={{padding: '8px', textAlign: 'center', width: '60px'}}>
                                    <input
                                        type="checkbox"
                                        checked={assignment.isDisqualified}
                                        onChange={(e) => updateAssignment(assignment.competitorName, 'isDisqualified', e.target.checked)}
                                        style={{transform: 'scale(1.2)'}}
                                    />
                                </td>
                                <td style={{padding: '8px', textAlign: 'center', width: '80px'}}>
                                    <button
                                        onClick={() => removeCompetitor(assignment.competitorName)}
                                        style={{
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Mode Selection */}
            {finalRankings.length > 0 && (
                <div className="section">
                    <div className="section-title">View Rankings By:</div>
                    <div className="button-row" style={{flexWrap: 'wrap'}}>
                        <button
                            onClick={() => setViewMode('final')}
                            className={`feature-button ${viewMode === 'final' ? 'feature-active' : ''}`}
                        >
                            Final Rankings
                        </button>
                        <button
                            onClick={() => setViewMode('technical')}
                            className={`feature-button ${viewMode === 'technical' ? 'feature-active' : ''}`}
                        >
                            Technical Combined
                        </button>
                        <button
                            onClick={() => setViewMode('performance')}
                            className={`feature-button ${viewMode === 'performance' ? 'feature-active' : ''}`}
                        >
                            Performance Average
                        </button>
                        <button
                            onClick={() => setViewMode('tech1')}
                            className={`feature-button ${viewMode === 'tech1' ? 'feature-active' : ''}`}
                        >
                            Tech Judge 1
                        </button>
                        <button
                            onClick={() => setViewMode('tech2')}
                            className={`feature-button ${viewMode === 'tech2' ? 'feature-active' : ''}`}
                        >
                            Tech Judge 2
                        </button>
                        <button
                            onClick={() => setViewMode('tech3')}
                            className={`feature-button ${viewMode === 'tech3' ? 'feature-active' : ''}`}
                        >
                            Tech Judge 3
                        </button>
                        <button
                            onClick={() => setViewMode('perf1')}
                            className={`feature-button ${viewMode === 'perf1' ? 'feature-active' : ''}`}
                        >
                            Perf Judge 1
                        </button>
                        <button
                            onClick={() => setViewMode('perf2')}
                            className={`feature-button ${viewMode === 'perf2' ? 'feature-active' : ''}`}
                        >
                            Perf Judge 2
                        </button>
                    </div>
                </div>
            )}

            {/* Rankings Display */}
            {finalRankings.length > 0 && (
                <div className="section">
                    <div className="section-title">
                        {getRankingTitle()}
                        {viewMode === 'final' && ` (Highest Technical Total: ${formatScore(highestTechnicalTotal)})`}
                    </div>
                    <div className="details-list">
                        {getSortedRankings().map((competitor, index) => {
                            const displayData = getScoreDisplay(competitor, index);

                            return (
                                <div key={competitor.name}
                                     className={`detail-item ${competitor.isDisqualified ? 'deduction-item-detail' : ''}`}>
                                    <div>
                                        <div className="detail-identifier">
                                            {displayData.rank}. {competitor.name}
                                            {competitor.isDisqualified && ' (DISQUALIFIED)'}
                                        </div>
                                        <div className="detail-breakdown">
                                            {displayData.breakdown}
                                        </div>
                                    </div>
                                    <div className="detail-score">
                                        <div
                                            className={`detail-points ${competitor.isDisqualified ? 'deduction-points' : ''}`}>
                                            {displayData.score}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Export Current Rankings */}
            {finalRankings.length > 0 && (
                <div className="section">
                    <div className="section-title">Export Current Rankings
                        ({getRankingTitle().replace(' (Input Order)', '').replace(' (Ranked Order)', '')}):
                    </div>
                    <div className="section">
                        <div className="section-title">Export Order:</div>
                        <div className="button-row">
                            <button
                                onClick={() => setExportOrder('ranking')}
                                className={`feature-button ${exportOrder === 'ranking' ? 'feature-active' : ''}`}
                            >
                                Ranked Order (1st to Last)
                            </button>
                            <button
                                onClick={() => setExportOrder('input')}
                                className={`feature-button ${exportOrder === 'input' ? 'feature-active' : ''}`}
                            >
                                Input Order (As Entered)
                            </button>
                        </div>
                    </div>
                    <div className="section-title">Export Format:</div>
                    <div className="button-row">
                        <button onClick={() => exportCurrentRankings('csv')} className="feature-button feature-active">
                            Export CSV
                        </button>
                        <button onClick={() => exportCurrentRankings('txt')} className="feature-button feature-active">
                            Export TXT
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default FinalRankingsTab;