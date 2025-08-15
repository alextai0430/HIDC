import React from 'react';
import {Score, SavedCompetitor, PerformanceScore, JudgeCategory} from './types';
import {goeLevels, multiplierLevels, performanceCategories} from './constants';
import {formatScore, csvEscape, downloadFile, calculateAdjustedScore, getHighestTechnicalScore} from './utils';

interface ExportSubmitTabProps {
    competitorName: string;
    setCompetitorName: (name: string) => void;
    judgeName: string;
    setJudgeName: (name: string) => void;
    judgeCategory: JudgeCategory;
    totalScore: number;
    scores: Score[];
    performanceScores: PerformanceScore;
    totalPerformanceScore: number;
    editingCompetitor: SavedCompetitor | null;
    isDisqualified: boolean;
    submitFinalScore: () => void;
    savedCompetitors: SavedCompetitor[];
}

const ExportSubmitTab: React.FC<ExportSubmitTabProps> = ({
                                                             competitorName,
                                                             setCompetitorName,
                                                             judgeName,
                                                             setJudgeName,
                                                             judgeCategory,
                                                             totalScore,
                                                             scores,
                                                             performanceScores,
                                                             totalPerformanceScore,
                                                             editingCompetitor,
                                                             isDisqualified,
                                                             submitFinalScore,
                                                             savedCompetitors
                                                         }) => {
    const highestTechnicalScore = getHighestTechnicalScore(savedCompetitors);
    const adjustedScore = judgeCategory === 'technical' ?
        (isDisqualified ? 0 : calculateAdjustedScore(totalScore, highestTechnicalScore)) : 0;

    const buildCalculationDetails = (score: Score) => {
        if (score.difficulty === 'DEDUCTION') {
            return `Deduction: ${formatScore(score.baseScore)}`;
        }

        let calc = `${formatScore(score.baseScore)}`;

        if (score.multiplierLevel) {
            calc += ` × L${score.multiplierLevel}(${multiplierLevels[score.multiplierLevel]})`;
        }

        score.features.forEach(f => {
            if (f.multiplier) {
                calc += ` × ${f.abbrev}(${f.multiplier})`;
            } else if (f.points) {
                calc += ` + ${f.abbrev}(${f.points})`;
            }
        });

        if (score.goeLevel !== 0) {
            calc += ` × E${score.goeLevel >= 0 ? '+' : ''}${score.goeLevel}(${goeLevels[score.goeLevel]})`;
        }

        if (score.deductions && score.deductions.length > 0) {
            score.deductions.forEach(d => {
                calc += ` + ${d.abbrev}(${d.points})`;
            });
        }

        calc += ` = ${formatScore(score.finalScore)}`;
        return calc;
    };

    const buildTechnicalCsv = () => {
        const rows: (string | number)[][] = [];

        rows.push(['DIABOLO TECHNICAL SCORING REPORT']);
        rows.push(['Generated:', new Date().toLocaleString()]);
        rows.push(['Export Version:', '2.0 -  Detail']);
        rows.push([]);

        rows.push(['COMPETITOR INFORMATION']);
        rows.push(['Competitor Name:', competitorName]);
        rows.push(['Judge Name:', judgeName]);
        rows.push(['Judge Category:', 'Technical']);
        rows.push(['Competition Status:', isDisqualified ? 'DISQUALIFIED' : 'Qualified']);
        rows.push(['Export Timestamp:', new Date().toISOString()]);
        rows.push([]);

        if (isDisqualified) {
            rows.push(['DISQUALIFICATION NOTICE']);
            rows.push(['Status:', 'DISQUALIFIED']);
            rows.push(['Competition Score:', '0 points']);
            rows.push(['Adjusted Score:', '0 points']);
            rows.push(['Note:', 'All technical scores shown are for reference only']);
            rows.push([]);

            if (scores.length > 0) {
                rows.push(['REFERENCE SCORES (NOT COUNTED - COMPETITOR DISQUALIFIED)']);
                rows.push(['#', 'New Identifier', 'Trick Name', 'Difficulty', 'Base Score', 'Level Mult', 'Features', 'Execution', 'Deductions', 'Final Score', 'Step-by-Step Calculation']);

                scores.forEach((s, i) => {
                    rows.push([
                        i + 1,
                        s.identifier,
                        s.trick,
                        s.difficulty,
                        s.baseScore,
                        s.multiplierLevel ? `L${s.multiplierLevel} (×${multiplierLevels[s.multiplierLevel]})` : 'None',
                        s.features.map(f => `${f.abbrev}(${f.multiplier ? '×' + f.multiplier : '+' + f.points})`).join(', ') || 'None',
                        s.goeLevel !== 0 ? `E${s.goeLevel >= 0 ? '+' : ''}${s.goeLevel} (×${goeLevels[s.goeLevel]})` : 'E+0 (×1.0)',
                        s.deductions?.map(d => `${d.abbrev}(${d.points})`).join(', ') || 'None',
                        formatScore(s.finalScore),
                        buildCalculationDetails(s)
                    ]);
                });
            }
        } else {
            rows.push(['OFFICIAL TECHNICAL SCORES']);
            rows.push(['Raw Technical Total:', formatScore(totalScore), 'points']);
            rows.push(['Adjusted Competition Score:', formatScore(adjustedScore), 'points (out of 70)']);
            rows.push(['Highest Technical Score in Competition:', formatScore(highestTechnicalScore), 'points (scaling reference)']);
            rows.push([]);

            if (scores.length > 0) {
                rows.push(['DETAILED SCORE BREAKDOWN']);
                rows.push(['Order:', 'Trick → Level (L) → Features → Execution (E) → Deductions']);
                rows.push([]);
                rows.push(['#', 'Trick Name', 'Difficulty', 'Base Score', 'Level Mult', 'Features', 'Execution', 'Deductions', 'Final Score', 'Step-by-Step Calculation']);

                scores.forEach((s, i) => {
                    rows.push([
                        i + 1,
                        s.identifier,
                        s.trick,
                        s.difficulty,
                        s.baseScore,
                        s.multiplierLevel ? `L${s.multiplierLevel} (×${multiplierLevels[s.multiplierLevel]})` : 'None',
                        s.features.map(f => `${f.abbrev}(${f.multiplier ? '×' + f.multiplier : '+' + f.points})`).join(', ') || 'None',
                        s.goeLevel !== 0 ? `E${s.goeLevel >= 0 ? '+' : ''}${s.goeLevel} (×${goeLevels[s.goeLevel]})` : 'E+0 (×1.0)',
                        s.deductions?.map(d => `${d.abbrev}(${d.points})`).join(', ') || 'None',
                        formatScore(s.finalScore),
                        buildCalculationDetails(s)
                    ]);
                });
            }
        }

        rows.push([]);
        rows.push([' ABBREVIATION LEGEND ']);
        rows.push(['Abbreviation Order:', 'Trick → Level (L) → Features → Execution (E) → Deductions']);
        rows.push([]);
        rows.push(['TRICK ABBREVIATIONS']);
        rows.push(['#', 'Shuffle', 'Basic diabolo manipulation']);
        rows.push(['T', 'Toss/High', 'Throwing diabolo upward']);
        rows.push(['O', 'Orbit', 'Circular motion around body']);
        rows.push(['F', 'Feed the sun', 'Feeding motion to sun position']);
        rows.push(['S', 'Swing/Sun', 'Swinging or sun position tricks']);
        rows.push(['W', 'Whip', 'Whipping string motion']);
        rows.push(['R', 'Stick Release/Gen', 'Releasing/generating with sticks']);
        rows.push([]);
        rows.push(['LEVEL MULTIPLIERS (L)']);
        rows.push(['L1', '×2 multiplier', 'Level 1 difficulty increase']);
        rows.push(['L2', '×4 multiplier', 'Level 2 difficulty increase']);
        rows.push(['L3', '×6 multiplier', 'Level 3 difficulty increase']);
        rows.push(['L4', '×8 multiplier', 'Level 4 difficulty increase']);
        rows.push(['L5', '×10 multiplier', 'Level 5 difficulty increase']);
        rows.push([]);
        rows.push(['FEATURE MODIFIERS']);
        rows.push(['T1', '×1.7 multiplier', 'Turn 360° during trick']);
        rows.push(['T2', '×3.0 multiplier', 'Turn 720° during trick']);
        rows.push(['T3', '×5.0 multiplier', 'Turn 1080° during trick']);
        rows.push(['A', '+0.2 points', 'Acrobatic element added']);
        rows.push([]);
        rows.push(['EXECUTION GRADES (E)']);
        rows.push(['E-3', '×0.7 multiplier', 'Poor execution (-30%)']);
        rows.push(['E-2', '×0.8 multiplier', 'Below average execution (-20%)']);
        rows.push(['E-1', '×0.9 multiplier', 'Slightly below average (-10%)']);
        rows.push(['E+0', '×1.0 multiplier', 'Average execution (default)']);
        rows.push(['E+1', '×1.05 multiplier', 'Above average execution (+5%)']);
        rows.push(['E+2', '×1.1 multiplier', 'Good execution (+10%)']);
        rows.push(['E+3', '×1.15 multiplier', 'Excellent execution (+15%)']);
        rows.push([]);
        rows.push(['DEDUCTION CODES']);
        rows.push(['Drop', '-0.3 points', 'Unintentional drop of diabolo']);
        rows.push(['Tang', '-0.5 points', 'String tangle during performance']);
        rows.push(['Time', '-2 points', 'Time limit violation']);
        rows.push(['Other', '-2 points', 'Other rule violations']);
        rows.push([]);
        rows.push(['EXAMPLE BREAKDOWNS']);
        rows.push(['TL2T1E+1Drop', 'Toss × Level 2 × Turn 360° × Execution +1 + Drop deduction']);
        rows.push(['Calculation:', '1.0 × 4 × 1.7 × 1.05 + (-0.3) = 6.84 points']);
        rows.push(['#L5E-2', 'Shuffle × Level 5 × Execution -2']);
        rows.push(['Calculation:', '0.7 × 10 × 0.8 = 5.6 points']);

        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildPerformanceCsv = () => {
        const rows: (string | number)[][] = [];

        rows.push(['DIABOLO PERFORMANCE SCORING REPORT']);
        rows.push(['Generated:', new Date().toLocaleString()]);
        rows.push(['Export Version:', '2.0 -  Detail']);
        rows.push([]);

        rows.push(['COMPETITOR INFORMATION']);
        rows.push(['Competitor Name:', competitorName]);
        rows.push(['Judge Name:', judgeName]);
        rows.push(['Judge Category:', 'Performance']);
        rows.push(['Competition Status:', isDisqualified ? 'DISQUALIFIED' : 'Qualified']);
        rows.push(['Export Timestamp:', new Date().toISOString()]);
        rows.push([]);

        if (isDisqualified) {
            rows.push(['DISQUALIFICATION NOTICE']);
            rows.push(['Status:', 'DISQUALIFIED']);
            rows.push(['Competition Score:', '0/30.0 points']);
            rows.push(['Note:', 'All performance scores shown are for reference only']);
            rows.push([]);
        } else {
            rows.push(['OFFICIAL PERFORMANCE SCORES']);
            rows.push(['Total Performance Score:', formatScore(totalPerformanceScore), 'out of 30.0 points']);
            rows.push(['Percentage Score:', `${Math.round((totalPerformanceScore / 30) * 100)}%`]);
            rows.push([]);
        }

        rows.push(['DETAILED CATEGORY BREAKDOWN']);
        rows.push(['Category', 'Score', 'Out of', 'Percentage', 'Description']);
        performanceCategories.forEach(category => {
            const score = isDisqualified ? 0 : (performanceScores[category.key] || 0);
            const percentage = `${Math.round((score / 5) * 100)}%`;
            rows.push([category.name, formatScore(score), '5.0', percentage, category.description]);
        });

        rows.push([]);
        rows.push(['PERFORMANCE SCORING CRITERIA']);
        rows.push(['Category', 'Scoring Guidelines', 'What Judges Look For']);
        rows.push(['Control', '0-5 points', 'Technical mastery, precision, consistency, diabolo control']);
        rows.push(['Style', '0-5 points', 'Individual flair, artistic expression, creativity, uniqueness']);
        rows.push(['Space Usage', '0-5 points', 'Effective use of performance area, movement patterns, positioning']);
        rows.push(['Choreography', '0-5 points', 'Flow between tricks, transitions, rhythm, musical interpretation']);
        rows.push(['Construction', '0-5 points', 'Overall routine structure, progression, pacing, climax']);
        rows.push(['Showmanship', '0-5 points', 'Stage presence, audience engagement, entertainment value, charisma']);

        rows.push([]);
        rows.push(['SCORING SCALE REFERENCE']);
        rows.push(['Score Range', 'Performance Quality', 'Description']);
        rows.push(['0.0-1.0', 'Poor', 'Significant issues, major problems']);
        rows.push(['1.5-2.0', 'Below Average', 'Some issues, room for improvement']);
        rows.push(['2.5-3.0', 'Average', 'Competent performance, meets expectations']);
        rows.push(['3.5-4.0', 'Good', 'Above average, well executed']);
        rows.push(['4.5-5.0', 'Excellent', 'Outstanding performance, exceptional quality']);

        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildTechnicalTxt = () => {
        let txt = '';
        txt += `DIABOLO TECHNICAL SCORING REPORT\n`;
        txt += `Generated: ${new Date().toLocaleString()}\n`;
        txt += `Export Version: 2.0 -  Detail\n\n`;

        txt += `COMPETITOR INFORMATION\n`;
        txt += `Competitor: ${competitorName}\n`;
        txt += `Judge: ${judgeName} (Technical)\n`;
        txt += `Status: ${isDisqualified ? 'DISQUALIFIED' : 'Qualified'}\n`;
        txt += `Export Time: ${new Date().toISOString()}\n\n`;

        if (isDisqualified) {
            txt += `DISQUALIFICATION NOTICE\n`;
            txt += `⚠️  COMPETITOR DISQUALIFIED\n`;
            txt += `Competition Score: DQ (0 points)\n`;
            txt += `Adjusted Score: DQ (0 points)\n`;
            txt += `Note: All scores below are for reference only and do not count toward competition results.\n\n`;

            if (scores.length > 0) {
                txt += `REFERENCE SCORES (NOT COUNTED - COMPETITOR DISQUALIFIED)\n`;
                txt += `${'='.repeat(120)}\n`;
                txt += `#   New ID          | Trick (Diff)      | Base | Level | Features | Exec | Deduct | Final | Calculation\n`;
                txt += `${'-'.repeat(120)}\n`;
                scores.forEach((s, i) => {
                    const line =
                        `${String(i + 1).padEnd(3)} ` +
                        `${s.identifier.padEnd(15)} | ` +
                        `${`${s.trick} (${s.difficulty})`.padEnd(17)} | ` +
                        `${String(s.baseScore).padEnd(4)} | ` +
                        `${(s.multiplierLevel ? `L${s.multiplierLevel}` : 'None').padEnd(5)} | ` +
                        `${(s.features.map(f => f.abbrev).join(',') || 'None').padEnd(8)} | ` +
                        `${(s.goeLevel !== 0 ? `E${s.goeLevel >= 0 ? '+' : ''}${s.goeLevel}` : 'E+0').padEnd(4)} | ` +
                        `${(s.deductions?.map(d => d.abbrev).join(',') || 'None').padEnd(6)} | ` +
                        `${formatScore(s.finalScore).padEnd(5)} | ` +
                        buildCalculationDetails(s);
                    txt += line + '\n';
                });
            }
        } else {
            txt += `OFFICIAL TECHNICAL SCORES\n`;
            txt += `Raw Technical Total: ${formatScore(totalScore)} points\n`;
            txt += `Adjusted Competition Score: ${formatScore(adjustedScore)} points (out of 70)\n`;
            txt += `Highest Technical Score: ${formatScore(highestTechnicalScore)} points (scaling reference)\n\n`;

            if (scores.length > 0) {
                txt += `DETAILED SCORE BREAKDOWN\n`;
                txt += `Order: Trick → Level (L) → Features → Execution (E) → Deductions\n`;
                txt += `${'='.repeat(120)}\n`;
                txt += `#   New ID          | Trick (Diff)      | Base | Level | Features | Exec | Deduct | Final | Calculation\n`;
                txt += `${'-'.repeat(120)}\n`;
                scores.forEach((s, i) => {
                    const line =
                        `${String(i + 1).padEnd(3)} ` +
                        `${s.identifier.padEnd(15)} | ` +
                        `${`${s.trick} (${s.difficulty})`.padEnd(17)} | ` +
                        `${String(s.baseScore).padEnd(4)} | ` +
                        `${(s.multiplierLevel ? `L${s.multiplierLevel}` : 'None').padEnd(5)} | ` +
                        `${(s.features.map(f => f.abbrev).join(',') || 'None').padEnd(8)} | ` +
                        `${(s.goeLevel !== 0 ? `E${s.goeLevel >= 0 ? '+' : ''}${s.goeLevel}` : 'E+0').padEnd(4)} | ` +
                        `${(s.deductions?.map(d => d.abbrev).join(',') || 'None').padEnd(6)} | ` +
                        `${formatScore(s.finalScore).padEnd(5)} | ` +
                        buildCalculationDetails(s);
                    txt += line + '\n';
                });
            }
        }

        txt += `\n${'='.repeat(80)}\n`;
        txt += ` ABBREVIATION LEGEND\n`;
        txt += `${'='.repeat(80)}\n`;
        txt += `Abbreviation Order: Trick → Level (L) → Features → Execution (E) → Deductions\n\n`;

        txt += `TRICK ABBREVIATIONS:\n`;
        txt += `#  = Shuffle (Basic diabolo manipulation)\n`;
        txt += `T  = Toss/High (Throwing diabolo upward)\n`;
        txt += `O  = Orbit (Circular motion around body)\n`;
        txt += `F  = Feed the sun (Feeding motion to sun position)\n`;
        txt += `S  = Swing/Sun (Swinging or sun position tricks)\n`;
        txt += `W  = Whip (Whipping string motion)\n`;
        txt += `R  = Stick Release/Gen (Releasing/generating with sticks)\n\n`;

        txt += `LEVEL MULTIPLIERS (L):\n`;
        txt += `L1 = ×2 multiplier (Level 1 difficulty increase)\n`;
        txt += `L2 = ×4 multiplier (Level 2 difficulty increase)\n`;
        txt += `L3 = ×6 multiplier (Level 3 difficulty increase)\n`;
        txt += `L4 = ×8 multiplier (Level 4 difficulty increase)\n`;
        txt += `L5 = ×10 multiplier (Level 5 difficulty increase)\n\n`;

        txt += `FEATURE MODIFIERS:\n`;
        txt += `T1 = ×1.7 multiplier (Turn 360° during trick)\n`;
        txt += `T2 = ×3.0 multiplier (Turn 720° during trick)\n`;
        txt += `T3 = ×5.0 multiplier (Turn 1080° during trick)\n`;
        txt += `A  = +0.2 points (Acrobatic element added)\n\n`;

        txt += `EXECUTION GRADES (E):\n`;
        txt += `E-3 = ×0.7 multiplier (Poor execution, -30%)\n`;
        txt += `E-2 = ×0.8 multiplier (Below average execution, -20%)\n`;
        txt += `E-1 = ×0.9 multiplier (Slightly below average, -10%)\n`;
        txt += `E+0 = ×1.0 multiplier (Average execution, default)\n`;
        txt += `E+1 = ×1.05 multiplier (Above average execution, +5%)\n`;
        txt += `E+2 = ×1.1 multiplier (Good execution, +10%)\n`;
        txt += `E+3 = ×1.15 multiplier (Excellent execution, +15%)\n\n`;

        txt += `DEDUCTION CODES:\n`;
        txt += `Drop  = -0.3 points (Unintentional drop of diabolo)\n`;
        txt += `Tang  = -0.5 points (String tangle during performance)\n`;
        txt += `Time  = -2 points (Time limit violation)\n`;
        txt += `Other = -2 points (Other rule violations)\n\n`;

        txt += `EXAMPLE BREAKDOWNS:\n`;
        txt += `TL2T1E+1Drop = Toss × Level 2 × Turn 360° × Execution +1 + Drop deduction\n`;
        txt += `Calculation: 1.0 × 4 × 1.7 × 1.05 + (-0.3) = 6.84 points\n\n`;
        txt += `#L5E-2 = Shuffle × Level 5 × Execution -2\n`;
        txt += `Calculation: 0.7 × 10 × 0.8 = 5.6 points\n`;

        return txt;
    };

    const buildPerformanceTxt = () => {
        let txt = '';
        txt += `DIABOLO PERFORMANCE SCORING REPORT\n`;
        txt += `Generated: ${new Date().toLocaleString()}\n`;
        txt += `Export Version: 2.0 -  Detail\n\n`;

        txt += `COMPETITOR INFORMATION\n`;
        txt += `Competitor: ${competitorName}\n`;
        txt += `Judge: ${judgeName} (Performance)\n`;
        txt += `Status: ${isDisqualified ? 'DISQUALIFIED' : 'Qualified'}\n`;
        txt += `Export Time: ${new Date().toISOString()}\n\n`;

        if (isDisqualified) {
            txt += `DISQUALIFICATION NOTICE\n`;
            txt += `⚠️  COMPETITOR DISQUALIFIED\n`;
            txt += `Competition Score: DQ (0/30.0)\n`;
            txt += `Note: All scores below are for reference only.\n\n`;
        } else {
            txt += `OFFICIAL PERFORMANCE SCORES\n`;
            txt += `Total Performance Score: ${formatScore(totalPerformanceScore)}/30.0 points\n`;
            txt += `Percentage Score: ${Math.round((totalPerformanceScore / 30) * 100)}%\n\n`;
        }

        txt += `DETAILED CATEGORY BREAKDOWN\n`;
        txt += `${'='.repeat(80)}\n`;
        txt += `Category          | Score | Out of | Percentage | Description\n`;
        txt += `${'-'.repeat(80)}\n`;
        performanceCategories.forEach(category => {
            const score = isDisqualified ? 0 : (performanceScores[category.key] || 0);
            const percentage = `${Math.round((score / 5) * 100)}%`;
            const line = `${category.name.padEnd(17)}| ${formatScore(score).padEnd(5)} | 5.0    | ${percentage.padEnd(10)} | ${category.description}`;
            txt += line + '\n';
        });

        txt += `\n${'='.repeat(80)}\n`;
        txt += `PERFORMANCE SCORING CRITERIA\n`;
        txt += `${'='.repeat(80)}\n`;
        txt += `Control (0-5 points):\n`;
        txt += `  Technical mastery, precision, consistency, diabolo control\n\n`;
        txt += `Style (0-5 points):\n`;
        txt += `  Individual flair, artistic expression, creativity, uniqueness\n\n`;
        txt += `Space Usage (0-5 points):\n`;
        txt += `  Effective use of performance area, movement patterns, positioning\n\n`;
        txt += `Choreography (0-5 points):\n`;
        txt += `  Flow between tricks, transitions, rhythm, musical interpretation\n\n`;
        txt += `Construction (0-5 points):\n`;
        txt += `  Overall routine structure, progression, pacing, climax\n\n`;
        txt += `Showmanship (0-5 points):\n`;
        txt += `  Stage presence, audience engagement, entertainment value, charisma\n\n`;

        txt += `SCORING SCALE REFERENCE\n`;
        txt += `${'-'.repeat(60)}\n`;
        txt += `0.0-1.0  | Poor          | Significant issues, major problems\n`;
        txt += `1.5-2.0  | Below Average | Some issues, room for improvement\n`;
        txt += `2.5-3.0  | Average       | Competent performance, meets expectations\n`;
        txt += `3.5-4.0  | Good          | Above average, well executed\n`;
        txt += `4.5-5.0  | Excellent     | Outstanding performance, exceptional quality\n`;

        return txt;
    };

    const onExportCsv = () => {
        if (!judgeName.trim()) {
            alert('Please enter judge name before exporting');
            return;
        }
        const status = isDisqualified ? '_DQ' : '';
        const filename = `${competitorName || 'scores'}_${judgeCategory}_${status}.csv`;
        const content = judgeCategory === 'technical' ? buildTechnicalCsv() : buildPerformanceCsv();
        downloadFile(filename, content, 'text/csv;charset=utf-8');
    };

    const onExportTxt = () => {
        if (!judgeName.trim()) {
            alert('Please enter judge name before exporting');
            return;
        }
        const status = isDisqualified ? '_DQ' : '';
        const filename = `${competitorName || 'scores'}_${judgeCategory}_${status}.txt`;
        const content = judgeCategory === 'technical' ? buildTechnicalTxt() : buildPerformanceTxt();
        downloadFile(filename, content, 'text/plain;charset=utf-8');
    };

    const hasScores = judgeCategory === 'technical' ?
        (scores.length > 0 || isDisqualified) :
        (Object.values(performanceScores).some(score => score > 0) || isDisqualified);
    const canSubmitOrExport = competitorName.trim() && judgeName.trim() && hasScores;

    const currentTotal = isDisqualified ? 0 : (judgeCategory === 'technical' ? totalScore : totalPerformanceScore);
    const maxTotal = judgeCategory === 'technical' ? '' : '/30.0';
    const displayTotal = isDisqualified ? 'DQ' : formatScore(currentTotal);

    return (
        <>
            <div className="details-header">
                <h2 className="details-title">Export / Submit -  SYSTEM
                    ({judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)})</h2>
                <div className="details-total">
                    Total: {displayTotal}{!isDisqualified && maxTotal}
                    {judgeCategory === 'technical' && !isDisqualified && (
                        <div style={{fontSize: '14px', color: '#6b7280'}}>
                            Adjusted: {formatScore(adjustedScore)}
                        </div>
                    )}
                    {isDisqualified && (
                        <div style={{fontSize: '14px', color: '#dc2626'}}>
                            DISQUALIFIED
                        </div>
                    )}
                </div>
            </div>


            <div className="section">
                <div className="selected-features" style={{backgroundColor: '#f0f9ff', padding: '12px', borderLeft: '4px solid #0ea5e9'}}>
                    <strong>🔄 Order:</strong> Trick → Level (L) → Features → Execution (E) → Deductions<br/>
                    <strong>📝 Example:</strong> TL2T1E+1Drop = Toss × Level 2 × Turn 360° × Execution +1 + Drop<br/>
                    <strong>🧮 Calculation:</strong> 1.0 × 4 × 1.7 × 1.05 + (-0.3) = 6.84 points<br/>
                    <strong>🎯 Benefits:</strong> Clearer scoring logic, easier to understand, better organization
                </div>
            </div>

            <div className="section">
                <div className="section-title">Competitor name (required):</div>
                <input
                    type="text"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    className="competitor-input"
                    placeholder="Competitor Name"
                />
            </div>

            <div className="section">
                <div className="section-title">Judge name (required):</div>
                <input
                    type="text"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    className="competitor-input"
                    placeholder="Judge Name"
                />
            </div>

            <div className="section">
                <div className="section-title">Judge Category:</div>
                <div className="selected-features">
                    {judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)} Judge
                    {isDisqualified && ' - COMPETITOR DISQUALIFIED'}
                </div>
            </div>

            <div className="section">
                <button
                    className="submit-final-button"
                    onClick={submitFinalScore}
                    disabled={!canSubmitOrExport}
                    title={
                        !competitorName.trim() ? 'Enter competitor name to submit' :
                            !judgeName.trim() ? 'Enter judge name to submit' :
                                (!hasScores ? `No ${judgeCategory} scores to submit` : `Submit final ${judgeCategory} score and save competitor`)
                    }
                >
                    {editingCompetitor ? `Update Final Score & Save Changes (${judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)})` : `Submit Final Score & Save Competitor (${judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)})`}
                    {isDisqualified && ' - DQ'}
                </button>
            </div>

            <div className="section">
                <div className="section-title">Export:</div>
                <div className="button-row">
                    <button
                        className="level-button"
                        onClick={onExportCsv}
                        disabled={!canSubmitOrExport}
                        title={
                            !competitorName.trim() ? 'Enter competitor name to enable export' :
                                !judgeName.trim() ? 'Enter judge name to enable export' :
                                    (!hasScores ? `No ${judgeCategory} scores to export` : `Export  ${judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)} CSV with full details`)
                        }
                        style={{backgroundColor: '#059669', color: 'white'}}
                    >
                        🚀 Export  {judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)} CSV
                        {isDisqualified && ' - DQ'}
                    </button>
                    <button
                        className="level-button"
                        onClick={onExportTxt}
                        disabled={!canSubmitOrExport}
                        title={
                            !competitorName.trim() ? 'Enter competitor name to enable export' :
                                !judgeName.trim() ? 'Enter judge name to enable export' :
                                    (!hasScores ? `No ${judgeCategory} scores to export` : `Export  ${judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)} TXT with full details`)
                        }
                        style={{backgroundColor: '#7c3aed', color: 'white'}}
                    >
                        📄 Export  {judgeCategory.charAt(0).toUpperCase() + judgeCategory.slice(1)} TXT
                        {isDisqualified && ' - DQ'}
                    </button>
                </div>
                <div className="selected-features" style={{ marginTop: '8px' }}>
                     exports include: Complete legends, step-by-step calculations, competition details, and professional formatting
                </div>
            </div>

            <div className="section">
                <div className="section-title">Current Scoring Summary:</div>
                {isDisqualified ? (
                    <div className="selected-features" style={{color: '#dc2626'}}>
                        ⚠️ This competitor is DISQUALIFIED and will receive 0 points regardless of scores entered.
                        <br/>📋 All export data will be marked as "reference only" and clearly indicate DQ status.
                    </div>
                ) : (
                    judgeCategory === 'technical' ? (
                        <div className="selected-features">
                            {scores.length} technical score{scores.length !== 1 ? 's' : ''}
                            {scores.length > 0 && ` - Total: ${formatScore(totalScore)} (Adjusted: ${formatScore(adjustedScore)})`}
                            <br/>📈 Exports will include complete breakdown with Trick → Level (L) → Features → Execution (E) → Deductions
                        </div>
                    ) : (
                        <div className="selected-features">
                            Performance scores: {Object.values(performanceScores).filter(score => score > 0).length}/6
                            categories scored
                            {Object.values(performanceScores).some(score => score > 0) && ` - Total: ${formatScore(totalPerformanceScore)}/30.0`}
                            <br/>📊 Exports will include detailed category breakdowns and scoring criteria
                        </div>
                    )
                )}
            </div>
        </>
    );
};

export default ExportSubmitTab;