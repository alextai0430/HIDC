import React, {useState, useEffect} from 'react';
import {SavedCompetitor} from './types';
import {formatScore, csvEscape, downloadFile, formatDate} from './utils';

interface FinalRankingsTabProps {
    savedCompetitors: SavedCompetitor[];
}

interface CompetitorScores {
    name: string;
    technicalScores: [number, number, number];
    performanceScores: [number, number];
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

const STORAGE_KEY = 'diabolo-final-rankings-assignments';

const FinalRankingsTab: React.FC<FinalRankingsTabProps> = ({savedCompetitors}) => {
    const [judgeAssignments, setJudgeAssignments] = useState<JudgeAssignment[]>([]);
    const [finalRankings, setFinalRankings] = useState<CompetitorScores[]>([]);
    const [highestTechnicalTotal, setHighestTechnicalTotal] = useState<number>(0);
    const [viewMode, setViewMode] = useState<'final' | 'technical' | 'performance' | 'tech1' | 'tech2' | 'tech3' | 'perf1' | 'perf2'>('final');
    const [exportOrder, setExportOrder] = useState<'ranking' | 'input'>('ranking');

    // Load/save assignments from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setJudgeAssignments(JSON.parse(saved));
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    useEffect(() => {
        if (judgeAssignments.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(judgeAssignments));
        }
    }, [judgeAssignments]);

    // Calculate rankings
    useEffect(() => {
        if (judgeAssignments.length === 0) {
            setFinalRankings([]);
            setHighestTechnicalTotal(0);
            return;
        }

        const highestTech = Math.max(...judgeAssignments.map(a =>
            a.isDisqualified ? 0 : (a.tech1 + a.tech2 + a.tech3)
        ));
        setHighestTechnicalTotal(highestTech);

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

            return {
                name: assignment.competitorName,
                technicalScores: [assignment.tech1, assignment.tech2, assignment.tech3],
                performanceScores: [assignment.perf1, assignment.perf2],
                normalizedTechnical,
                averagePerformance,
                finalScore: normalizedTechnical + averagePerformance,
                isDisqualified: false
            };
        });

        setFinalRankings(rankings);
    }, [judgeAssignments]);

    const updateAssignment = (competitorName: string, field: keyof Omit<JudgeAssignment, 'competitorName'>, value: number | boolean) => {
        setJudgeAssignments(prev => prev.map(assignment =>
            assignment.competitorName === competitorName ? {...assignment, [field]: value} : assignment
        ));
    };

    const addCompetitor = () => {
        const name = prompt('Enter competitor name:');
        if (name?.trim() && !judgeAssignments.find(a => a.competitorName === name.trim())) {
            setJudgeAssignments(prev => [...prev, {
                competitorName: name.trim(),
                tech1: 0, tech2: 0, tech3: 0, perf1: 0, perf2: 0,
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
        if (window.confirm('Clear all scores? This will reset all judge assignments to 0 but keep the competitors.')) {
            setJudgeAssignments(prev => prev.map(a => ({...a, tech1: 0, tech2: 0, tech3: 0, perf1: 0, perf2: 0, isDisqualified: false})));
        }
    };

    const clearAllData = () => {
        if (window.confirm('Clear all data? This will remove all competitors and scores from final rankings permanently.')) {
            setJudgeAssignments([]);
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const getSortedRankings = (forExport = false) => {
        if (finalRankings.length === 0) return [];

        let sorted = [...finalRankings];
        if (forExport && exportOrder === 'input') {
            return judgeAssignments.map(a => finalRankings.find(fr => fr.name === a.competitorName)!).filter(Boolean);
        }

        // Create sorting functions for each view mode
        const sortFunctions = {
            final: (a: CompetitorScores, b: CompetitorScores) => b.finalScore - a.finalScore,
            technical: (a: CompetitorScores, b: CompetitorScores) => b.normalizedTechnical - a.normalizedTechnical,
            performance: (a: CompetitorScores, b: CompetitorScores) => b.averagePerformance - a.averagePerformance,
            tech1: (a: CompetitorScores, b: CompetitorScores) => b.technicalScores[0] - a.technicalScores[0],
            tech2: (a: CompetitorScores, b: CompetitorScores) => b.technicalScores[1] - a.technicalScores[1],
            tech3: (a: CompetitorScores, b: CompetitorScores) => b.technicalScores[2] - a.technicalScores[2],
            perf1: (a: CompetitorScores, b: CompetitorScores) => b.performanceScores[0] - a.performanceScores[0],
            perf2: (a: CompetitorScores, b: CompetitorScores) => b.performanceScores[1] - a.performanceScores[1]
        };

        return sorted.sort((a, b) => {
            if (a.isDisqualified && !b.isDisqualified) return 1;
            if (!a.isDisqualified && b.isDisqualified) return -1;
            if (a.isDisqualified && b.isDisqualified) return 0;
            return sortFunctions[viewMode](a, b);
        });
    };

    const getRankingTitle = () => {
        const titles = {
            final: 'Final Rankings',
            technical: 'Technical Rankings (Combined)',
            performance: 'Performance Rankings (Average)',
            tech1: 'Technical Judge 1 Rankings',
            tech2: 'Technical Judge 2 Rankings',
            tech3: 'Technical Judge 3 Rankings',
            perf1: 'Performance Judge 1 Rankings',
            perf2: 'Performance Judge 2 Rankings'
        };
        return titles[viewMode] + (exportOrder === 'input' ? ' (Input Order)' : ' (Ranked Order)');
    };

    const getScoreDisplay = (competitor: CompetitorScores, index: number, forExport = false) => {
        const rank = (forExport && exportOrder === 'input') ?
            (competitor.isDisqualified ? 'DQ' : '-') :
            (competitor.isDisqualified ? 'DQ' : (index + 1).toString());

        if (competitor.isDisqualified) return { rank, score: 'DQ', breakdown: 'Disqualified' };

        const displays = {
            final: {
                score: `${formatScore(competitor.finalScore)}/100`,
                breakdown: `Tech: ${formatScore(competitor.normalizedTechnical)}/70 | Perf: ${formatScore(competitor.averagePerformance)}/30`
            },
            technical: {
                score: formatScore(competitor.normalizedTechnical),
                breakdown: `(${competitor.technicalScores.map(s => formatScore(s)).join(' + ')}) / ${formatScore(highestTechnicalTotal)} × 70`
            },
            performance: {
                score: formatScore(competitor.averagePerformance),
                breakdown: `${competitor.performanceScores.map(s => formatScore(s)).join(' + ')} ÷ 2`
            },
            tech1: { score: formatScore(competitor.technicalScores[0]), breakdown: 'Technical Judge 1 Score' },
            tech2: { score: formatScore(competitor.technicalScores[1]), breakdown: 'Technical Judge 2 Score' },
            tech3: { score: formatScore(competitor.technicalScores[2]), breakdown: 'Technical Judge 3 Score' },
            perf1: { score: formatScore(competitor.performanceScores[0]), breakdown: 'Performance Judge 1 Score' },
            perf2: { score: formatScore(competitor.performanceScores[1]), breakdown: 'Performance Judge 2 Score' }
        };

        return { rank, ...displays[viewMode] };
    };

    const exportCurrentRankings = (format: 'csv' | 'txt') => {
        if (finalRankings.length === 0) return;

        const sorted = getSortedRankings(true);
        const baseTitle = getRankingTitle().replace(' (Input Order)', '').replace(' (Ranked Order)', '');
        const orderSuffix = exportOrder === 'input' ? '_input_order' : '_ranked';
        const filename = `${baseTitle.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')}${orderSuffix}.${format}`;

        let content = '';
        if (format === 'csv') {
            const rows: (string | number)[][] = [
                [`${baseTitle} - ${exportOrder === 'input' ? 'Input Order' : 'Ranked Order'}`],
                [`Generated: ${formatDate(new Date().toISOString())}`]
            ];

            // Add formula info - Always show comprehensive formula for final rankings, tech combined, and perf average
            if (viewMode === 'final') {
                rows.push([`Scoring Formula: ((Tech1 + Tech2 + Tech3) / Highest Tech Total) × 70 + (Perf1 + Perf2) ÷ 2`]);
                rows.push([`Technical Max: 70 points (normalized from highest total: ${formatScore(highestTechnicalTotal)})`]);
                rows.push([`Performance Max: 30 points (average of two judges)`]);
                rows.push([`Final Score Max: 100 points`]);
            } else if (viewMode === 'technical') {
                rows.push([`Formula: ((Tech1 + Tech2 + Tech3) / Highest Tech Total) × 70`]);
                rows.push([`Highest Technical Total: ${formatScore(highestTechnicalTotal)}`]);
                rows.push([`Max Technical Score: 70 points (normalized)`]);
            } else if (viewMode === 'performance') {
                rows.push([`Formula: (Perf1 + Perf2) ÷ 2`]);
                rows.push([`Max Performance Score: 30 points (average of two judges)`]);
            }
            rows.push([]);

            // Headers - Always comprehensive for final rankings, tech combined, and perf average
            let headers = [exportOrder === 'input' ? 'Position' : 'Rank', 'Competitor'];
            if (viewMode === 'final') {
                headers = [...headers, 'Tech Judge 1', 'Tech Judge 2', 'Tech Judge 3', 'Tech Raw Total',
                    'Tech Normalized (×70)', 'Perf Judge 1', 'Perf Judge 2', 'Perf Average',
                    'Final Score (/100)', 'Status'];
            } else if (viewMode === 'technical') {
                headers = [...headers, 'Tech Judge 1', 'Tech Judge 2', 'Tech Judge 3', 'Tech Raw Total',
                    'Tech Normalized (/70)', 'Status'];
            } else if (viewMode === 'performance') {
                headers = [...headers, 'Perf Judge 1', 'Perf Judge 2', 'Performance Average (/30)', 'Status'];
            } else {
                headers = [...headers, 'Score', 'Status'];
            }
            rows.push(headers);

            // Data rows
            sorted.forEach((competitor, index) => {
                const position = (exportOrder === 'input' && !competitor.isDisqualified) ?
                    (index + 1).toString() :
                    (competitor.isDisqualified ? 'DQ' : (index + 1).toString());
                const status = competitor.isDisqualified ? 'Disqualified' : 'Qualified';
                let row: (string | number)[] = [position, competitor.name];

                if (viewMode === 'final') {
                    const techTotal = competitor.technicalScores.reduce((sum, score) => sum + score, 0);
                    row = [...row,
                        ...competitor.technicalScores.map(formatScore),
                        formatScore(techTotal),
                        formatScore(competitor.normalizedTechnical),
                        ...competitor.performanceScores.map(formatScore),
                        formatScore(competitor.averagePerformance),
                        formatScore(competitor.finalScore),
                        status];
                } else if (viewMode === 'technical') {
                    const techTotal = competitor.technicalScores.reduce((sum, score) => sum + score, 0);
                    row = [...row,
                        ...competitor.technicalScores.map(formatScore),
                        formatScore(techTotal),
                        formatScore(competitor.normalizedTechnical),
                        status];
                } else if (viewMode === 'performance') {
                    row = [...row,
                        ...competitor.performanceScores.map(formatScore),
                        formatScore(competitor.averagePerformance),
                        status];
                } else {
                    const scoreMap = {
                        tech1: competitor.technicalScores[0], tech2: competitor.technicalScores[1], tech3: competitor.technicalScores[2],
                        perf1: competitor.performanceScores[0], perf2: competitor.performanceScores[1]
                    };
                    row = [...row, formatScore(scoreMap[viewMode as keyof typeof scoreMap] || 0), status];
                }
                rows.push(row);
            });

            content = rows.map(r => r.map(csvEscape).join(',')).join('\n');
        } else {
            // TXT format
            content = `${baseTitle} - ${exportOrder === 'input' ? 'Input Order' : 'Ranked Order'}\n`;
            content += `Generated: ${formatDate(new Date().toISOString())}\n\n`;

            // Comprehensive formula explanation for final rankings, tech combined, and perf average
            if (viewMode === 'final') {
                content += `SCORING FORMULA:\n`;
                content += `Final Score = ((Tech1 + Tech2 + Tech3) ÷ Highest Tech Total) × 70 + (Perf1 + Perf2) ÷ 2\n\n`;
                content += `COMPONENT BREAKDOWN:\n`;
                content += `• Technical Component: Normalized to 70 points maximum\n`;
                content += `  - Raw scores from 3 technical judges are summed\n`;
                content += `  - Divided by highest technical total: ${formatScore(highestTechnicalTotal)}\n`;
                content += `  - Multiplied by 70 for normalization\n`;
                content += `• Performance Component: Averaged to 30 points maximum\n`;
                content += `  - Raw scores from 2 performance judges\n`;
                content += `  - Averaged (not summed) for fairness\n`;
                content += `• Maximum Possible Score: 100 points\n`;
                content += `• Disqualified competitors: 0 points, ranked last\n\n`;
            } else if (viewMode === 'technical') {
                content += `TECHNICAL SCORING FORMULA:\n`;
                content += `Tech Score = ((Tech1 + Tech2 + Tech3) ÷ Highest Tech Total) × 70\n\n`;
                content += `TECHNICAL BREAKDOWN:\n`;
                content += `• Raw scores from 3 technical judges are summed\n`;
                content += `• Divided by highest technical total in competition: ${formatScore(highestTechnicalTotal)}\n`;
                content += `• Multiplied by 70 for normalization\n`;
                content += `• Maximum Technical Score: 70 points\n`;
                content += `• Disqualified competitors: 0 points, ranked last\n\n`;
            } else if (viewMode === 'performance') {
                content += `PERFORMANCE SCORING FORMULA:\n`;
                content += `Performance Score = (Perf1 + Perf2) ÷ 2\n\n`;
                content += `PERFORMANCE BREAKDOWN:\n`;
                content += `• Raw scores from 2 performance judges\n`;
                content += `• Averaged (not summed) for fairness\n`;
                content += `• Maximum Performance Score: 30 points\n`;
                content += `• Disqualified competitors: 0 points, ranked last\n\n`;
            } else {
                content += `Individual Judge Rankings\n\n`;
            }

            // Enhanced column widths for comprehensive display
            const colWidths = viewMode === 'final' ?
                { pos: 4, competitor: 20, tech1: 6, tech2: 6, tech3: 6, techTotal: 9, techNorm: 9, perf1: 6, perf2: 6, perfAvg: 8, final: 8, status: 6 } as const :
                viewMode === 'technical' ?
                    { pos: 4, competitor: 20, tech1: 6, tech2: 6, tech3: 6, techTotal: 9, techNorm: 9, status: 6 } as const :
                    viewMode === 'performance' ?
                        { pos: 4, competitor: 20, perf1: 6, perf2: 6, perfAvg: 8, status: 6 } as const :
                        { pos: 5, competitor: 22, details: 40, final: 12, status: 6 } as const;

            const padColumn = (text: string, width: number, align: 'left' | 'right' = 'left'): string => {
                const str = String(text || '');
                if (str.length >= width) return str.substring(0, width);
                const padding = width - str.length;
                return align === 'right' ? ' '.repeat(padding) + str : str + ' '.repeat(padding);
            };

            const positionHeader = exportOrder === 'input' ? 'Pos' : 'Rank';

            if (viewMode === 'final') {
                // Comprehensive header for final rankings
                const finalColWidths = colWidths as { pos: number, competitor: number, tech1: number, tech2: number, tech3: number, techTotal: number, techNorm: number, perf1: number, perf2: number, perfAvg: number, final: number, status: number };
                const headerRow = padColumn(positionHeader, finalColWidths.pos) + '| ' +
                    padColumn('Competitor', finalColWidths.competitor) + '| ' +
                    padColumn('Tech1', finalColWidths.tech1, 'right') + '| ' +
                    padColumn('Tech2', finalColWidths.tech2, 'right') + '| ' +
                    padColumn('Tech3', finalColWidths.tech3, 'right') + '| ' +
                    padColumn('TechTotal', finalColWidths.techTotal, 'right') + '| ' +
                    padColumn('TechNorm', finalColWidths.techNorm, 'right') + '| ' +
                    padColumn('Perf1', finalColWidths.perf1, 'right') + '| ' +
                    padColumn('Perf2', finalColWidths.perf2, 'right') + '| ' +
                    padColumn('PerfAvg', finalColWidths.perfAvg, 'right') + '| ' +
                    padColumn('Final', finalColWidths.final, 'right') + '| ' +
                    padColumn('Status', finalColWidths.status);

                content += headerRow + '\n';
                const totalWidth = Object.values(finalColWidths).reduce((sum, width) => sum + width, 0) + (Object.keys(finalColWidths).length - 1) * 2;
                content += '-'.repeat(totalWidth) + '\n';

                sorted.forEach((competitor, index) => {
                    const position = (exportOrder === 'input' && !competitor.isDisqualified) ?
                        (index + 1).toString() :
                        (competitor.isDisqualified ? 'DQ' : (index + 1).toString());
                    const status = competitor.isDisqualified ? 'DQ' : 'OK';
                    const techTotal = competitor.technicalScores.reduce((sum, score) => sum + score, 0);

                    const line = padColumn(position, finalColWidths.pos) + '| ' +
                        padColumn(competitor.name, finalColWidths.competitor) + '| ' +
                        padColumn(formatScore(competitor.technicalScores[0]), finalColWidths.tech1, 'right') + '| ' +
                        padColumn(formatScore(competitor.technicalScores[1]), finalColWidths.tech2, 'right') + '| ' +
                        padColumn(formatScore(competitor.technicalScores[2]), finalColWidths.tech3, 'right') + '| ' +
                        padColumn(formatScore(techTotal), finalColWidths.techTotal, 'right') + '| ' +
                        padColumn(formatScore(competitor.normalizedTechnical), finalColWidths.techNorm, 'right') + '| ' +
                        padColumn(formatScore(competitor.performanceScores[0]), finalColWidths.perf1, 'right') + '| ' +
                        padColumn(formatScore(competitor.performanceScores[1]), finalColWidths.perf2, 'right') + '| ' +
                        padColumn(formatScore(competitor.averagePerformance), finalColWidths.perfAvg, 'right') + '| ' +
                        padColumn(formatScore(competitor.finalScore), finalColWidths.final, 'right') + '| ' +
                        padColumn(status, finalColWidths.status);

                    content += line + '\n';
                });
            } else if (viewMode === 'technical') {
                // Comprehensive header for technical rankings
                const techColWidths = colWidths as { pos: number, competitor: number, tech1: number, tech2: number, tech3: number, techTotal: number, techNorm: number, status: number };
                const headerRow = padColumn(positionHeader, techColWidths.pos) + '| ' +
                    padColumn('Competitor', techColWidths.competitor) + '| ' +
                    padColumn('Tech1', techColWidths.tech1, 'right') + '| ' +
                    padColumn('Tech2', techColWidths.tech2, 'right') + '| ' +
                    padColumn('Tech3', techColWidths.tech3, 'right') + '| ' +
                    padColumn('TechTotal', techColWidths.techTotal, 'right') + '| ' +
                    padColumn('TechNorm', techColWidths.techNorm, 'right') + '| ' +
                    padColumn('Status', techColWidths.status);

                content += headerRow + '\n';
                const totalWidth = Object.values(techColWidths).reduce((sum, width) => sum + width, 0) + (Object.keys(techColWidths).length - 1) * 2;
                content += '-'.repeat(totalWidth) + '\n';

                sorted.forEach((competitor, index) => {
                    const position = (exportOrder === 'input' && !competitor.isDisqualified) ?
                        (index + 1).toString() :
                        (competitor.isDisqualified ? 'DQ' : (index + 1).toString());
                    const status = competitor.isDisqualified ? 'DQ' : 'OK';
                    const techTotal = competitor.technicalScores.reduce((sum, score) => sum + score, 0);

                    const line = padColumn(position, techColWidths.pos) + '| ' +
                        padColumn(competitor.name, techColWidths.competitor) + '| ' +
                        padColumn(formatScore(competitor.technicalScores[0]), techColWidths.tech1, 'right') + '| ' +
                        padColumn(formatScore(competitor.technicalScores[1]), techColWidths.tech2, 'right') + '| ' +
                        padColumn(formatScore(competitor.technicalScores[2]), techColWidths.tech3, 'right') + '| ' +
                        padColumn(formatScore(techTotal), techColWidths.techTotal, 'right') + '| ' +
                        padColumn(formatScore(competitor.normalizedTechnical), techColWidths.techNorm, 'right') + '| ' +
                        padColumn(status, techColWidths.status);

                    content += line + '\n';
                });
            } else if (viewMode === 'performance') {
                // Comprehensive header for performance rankings
                const perfColWidths = colWidths as { pos: number, competitor: number, perf1: number, perf2: number, perfAvg: number, status: number };
                const headerRow = padColumn(positionHeader, perfColWidths.pos) + '| ' +
                    padColumn('Competitor', perfColWidths.competitor) + '| ' +
                    padColumn('Perf1', perfColWidths.perf1, 'right') + '| ' +
                    padColumn('Perf2', perfColWidths.perf2, 'right') + '| ' +
                    padColumn('PerfAvg', perfColWidths.perfAvg, 'right') + '| ' +
                    padColumn('Status', perfColWidths.status);

                content += headerRow + '\n';
                const totalWidth = Object.values(perfColWidths).reduce((sum, width) => sum + width, 0) + (Object.keys(perfColWidths).length - 1) * 2;
                content += '-'.repeat(totalWidth) + '\n';

                sorted.forEach((competitor, index) => {
                    const position = (exportOrder === 'input' && !competitor.isDisqualified) ?
                        (index + 1).toString() :
                        (competitor.isDisqualified ? 'DQ' : (index + 1).toString());
                    const status = competitor.isDisqualified ? 'DQ' : 'OK';

                    const line = padColumn(position, perfColWidths.pos) + '| ' +
                        padColumn(competitor.name, perfColWidths.competitor) + '| ' +
                        padColumn(formatScore(competitor.performanceScores[0]), perfColWidths.perf1, 'right') + '| ' +
                        padColumn(formatScore(competitor.performanceScores[1]), perfColWidths.perf2, 'right') + '| ' +
                        padColumn(formatScore(competitor.averagePerformance), perfColWidths.perfAvg, 'right') + '| ' +
                        padColumn(status, perfColWidths.status);

                    content += line + '\n';
                });
            } else {
                // Standard format for other view modes
                const standardColWidths = colWidths as { pos: number, competitor: number, details: number, final: number, status: number };
                const headerRow = padColumn(positionHeader, standardColWidths.pos) + '| ' +
                    padColumn('Competitor', standardColWidths.competitor) + '| ' +
                    padColumn('Score Details', standardColWidths.details) + '| ' +
                    padColumn('Final Score', standardColWidths.final) + '| ' +
                    padColumn('Status', standardColWidths.status);

                content += headerRow + '\n';
                content += '-'.repeat(Object.values(standardColWidths).reduce((sum, width) => sum + width, 0) + (Object.keys(standardColWidths).length - 1) * 2) + '\n';

                sorted.forEach((competitor, index) => {
                    const position = competitor.isDisqualified ? 'DQ' : (index + 1).toString();
                    const status = competitor.isDisqualified ? 'DQ' : 'OK';
                    const displayData = getScoreDisplay(competitor, index, true);

                    const line = padColumn(position, standardColWidths.pos) + '| ' +
                        padColumn(competitor.name, standardColWidths.competitor) + '| ' +
                        padColumn(displayData.breakdown, standardColWidths.details) + '| ' +
                        padColumn(displayData.score, standardColWidths.final, 'right') + '| ' +
                        padColumn(status, standardColWidths.status);

                    content += line + '\n';
                });
            }
        }

        const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
        downloadFile(filename, content, mimeType);
    };

    const renderScoreInput = (assignment: JudgeAssignment, field: 'tech1' | 'tech2' | 'tech3' | 'perf1' | 'perf2') => (
        <input
            type="text"
            value={assignment[field]}
            onChange={(e) => {
                const value = parseFloat(e.target.value);
                updateAssignment(assignment.competitorName, field, isNaN(value) ? 0 : value);
            }}
            disabled={assignment.isDisqualified}
            style={{
                width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db',
                textAlign: 'center', backgroundColor: assignment.isDisqualified ? '#f3f4f6' : 'white',
                appearance: 'textfield'
            }}
        />
    );

    const viewModeButtons = [
        { key: 'final', label: 'Final Rankings' },
        { key: 'technical', label: 'Technical Combined' },
        { key: 'performance', label: 'Performance Average' },
        { key: 'tech1', label: 'Tech Judge 1' },
        { key: 'tech2', label: 'Tech Judge 2' },
        { key: 'tech3', label: 'Tech Judge 3' },
        { key: 'perf1', label: 'Perf Judge 1' },
        { key: 'perf2', label: 'Perf Judge 2' }
    ];

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
                    <button onClick={addCompetitor} className="feature-button feature-active">Add Competitor</button>
                    <button onClick={clearAllScores} className="feature-button" style={{backgroundColor: '#f59e0b', color: 'white'}}>Clear Scores Only</button>
                    <button onClick={clearAllData} className="feature-button" style={{backgroundColor: '#dc2626', color: 'white'}}>Clear All Data</button>
                </div>
                <div className="selected-features">
                    • <strong>Clear Scores Only:</strong> Resets all scores to 0 but keeps competitors<br/>
                    • <strong>Clear All Data:</strong> Removes all competitors and scores permanently
                </div>
            </div>

            {/* Formula Explanation */}
            <div className="section">
                <div className="section-title">Scoring Formula:</div>
                <div className="selected-features">
                    <strong>Final Score = ((Tech1 + Tech2 + Tech3) ÷ Highest Tech Total) × 70 + (Perf1 + Perf2) ÷ 2</strong><br/>
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
                    <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px'}}>
                        <thead>
                        <tr style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
                            <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '200px'}}>Competitor</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Tech 1</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Tech 2</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Tech 3</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Perf 1</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '90px'}}>Perf 2</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '60px'}}>DQ</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '80px'}}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {judgeAssignments.map((assignment) => (
                            <tr key={assignment.competitorName} style={{borderBottom: '1px solid #e5e7eb'}}>
                                <td style={{padding: '12px', fontWeight: 'bold', width: '200px'}}>{assignment.competitorName}</td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>{renderScoreInput(assignment, 'tech1')}</td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>{renderScoreInput(assignment, 'tech2')}</td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>{renderScoreInput(assignment, 'tech3')}</td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>{renderScoreInput(assignment, 'perf1')}</td>
                                <td style={{padding: '8px', width: '90px', textAlign: 'center'}}>{renderScoreInput(assignment, 'perf2')}</td>
                                <td style={{padding: '8px', textAlign: 'center', width: '60px'}}>
                                    <input type="checkbox" checked={assignment.isDisqualified}
                                           onChange={(e) => updateAssignment(assignment.competitorName, 'isDisqualified', e.target.checked)}
                                           style={{transform: 'scale(1.2)'}} />
                                </td>
                                <td style={{padding: '8px', textAlign: 'center', width: '80px'}}>
                                    <button onClick={() => removeCompetitor(assignment.competitorName)}
                                            style={{backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px',
                                                padding: '6px 12px', fontSize: '12px', cursor: 'pointer'}}>Remove</button>
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
                        {viewModeButtons.map(({key, label}) => (
                            <button key={key} onClick={() => setViewMode(key as any)}
                                    className={`feature-button ${viewMode === key ? 'feature-active' : ''}`}>
                                {label}
                            </button>
                        ))}
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
                                <div key={competitor.name} className={`detail-item ${competitor.isDisqualified ? 'deduction-item-detail' : ''}`}>
                                    <div>
                                        <div className="detail-identifier">
                                            {displayData.rank}. {competitor.name}
                                            {competitor.isDisqualified && ' (DISQUALIFIED)'}
                                        </div>
                                        <div className="detail-breakdown">{displayData.breakdown}</div>
                                    </div>
                                    <div className="detail-score">
                                        <div className={`detail-points ${competitor.isDisqualified ? 'deduction-points' : ''}`}>
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
                    <div className="section-title">Export Current Rankings ({getRankingTitle().replace(' (Input Order)', '').replace(' (Ranked Order)', '')}):</div>
                    <div className="section">
                        <div className="section-title">Export Order:</div>
                        <div className="button-row">
                            <button onClick={() => setExportOrder('ranking')}
                                    className={`feature-button ${exportOrder === 'ranking' ? 'feature-active' : ''}`}>
                                Ranked Order (1st to Last)
                            </button>
                            <button onClick={() => setExportOrder('input')}
                                    className={`feature-button ${exportOrder === 'input' ? 'feature-active' : ''}`}>
                                Input Order (As Entered)
                            </button>
                        </div>
                    </div>
                    <div className="section-title">Export Format:</div>
                    <div className="button-row">
                        <button onClick={() => exportCurrentRankings('csv')} className="feature-button feature-active">Export CSV</button>
                        <button onClick={() => exportCurrentRankings('txt')} className="feature-button feature-active">Export TXT</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default FinalRankingsTab;