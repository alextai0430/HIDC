import React, { useState } from 'react';
import { SavedCompetitor } from './types';
import { formatScore, csvEscape, downloadFile, formatDate } from './utils';

interface RankingsTabProps {
    savedCompetitors: SavedCompetitor[];
}

type RankingView = 'technical' | 'performance';
type ExportOrder = 'ranking' | 'submission';

const RankingsTab: React.FC<RankingsTabProps> = ({ savedCompetitors }) => {
    const [rankingView, setRankingView] = useState<RankingView>('technical');

    // Process competitors for rankings
    const processCompetitorsForRanking = () => {
        return savedCompetitors.map(competitor => {
            const technicalScore = competitor.judgeCategory === 'technical'
                ? competitor.isDisqualified ? 0 : competitor.totalScore
                : 0;

            const performanceScore = competitor.judgeCategory === 'performance'
                ? competitor.isDisqualified ? 0 : (competitor.totalPerformanceScore || 0)
                : 0;

            return {
                ...competitor,
                technicalScore,
                performanceScore
            };
        });
    };

    const getRankedCompetitors = () => {
        const processed = processCompetitorsForRanking();

        switch (rankingView) {
            case 'technical':
                return processed
                    .filter(comp => comp.judgeCategory === 'technical')
                    .sort((a, b) => {
                        // DQ competitors go to the bottom
                        if (a.isDisqualified && !b.isDisqualified) return 1;
                        if (!a.isDisqualified && b.isDisqualified) return -1;
                        if (a.isDisqualified && b.isDisqualified) return 0;
                        return b.technicalScore - a.technicalScore;
                    });

            case 'performance':
            default:
                return processed
                    .filter(comp => comp.judgeCategory === 'performance')
                    .sort((a, b) => {
                        // DQ competitors go to the bottom
                        if (a.isDisqualified && !b.isDisqualified) return 1;
                        if (!a.isDisqualified && b.isDisqualified) return -1;
                        if (a.isDisqualified && b.isDisqualified) return 0;
                        return b.performanceScore - a.performanceScore;
                    });
        }
    };

    const getSubmissionOrderCompetitors = () => {
        const processed = processCompetitorsForRanking();
        return processed
            .filter(comp => comp.judgeCategory === rankingView)
            .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    };

    const rankedCompetitors = getRankedCompetitors();
    const submissionOrderCompetitors = getSubmissionOrderCompetitors();

    const getScoreDisplay = (competitor: any, rank: number) => {
        if (competitor.isDisqualified) {
            return (
                <div className="detail-score">
                    <div className="detail-points" style={{ color: '#dc2626' }}>DQ</div>
                    <div className="detail-breakdown">Disqualified</div>
                </div>
            );
        }

        switch (rankingView) {
            case 'technical':
                return (
                    <div className="detail-score">
                        <div className="detail-points">{formatScore(competitor.technicalScore)}</div>
                        <div className="detail-breakdown">Technical Score</div>
                    </div>
                );

            case 'performance':
            default:
                return (
                    <div className="detail-score">
                        <div className="detail-points">{formatScore(competitor.performanceScore)}/30.0</div>
                        <div className="detail-breakdown">Performance Score</div>
                    </div>
                );
        }
    };

    const getRankingTitle = () => {
        switch (rankingView) {
            case 'technical':
                return 'Technical Rankings';
            case 'performance':
            default:
                return 'Performance Rankings';
        }
    };

    const getRankingDescription = () => {
        switch (rankingView) {
            case 'technical':
                return 'Ranked by technical scores';
            case 'performance':
            default:
                return 'Ranked by performance scores (out of 30 points)';
        }
    };

    const buildRankingCsv = (order: ExportOrder) => {
        const competitors = order === 'ranking' ? rankedCompetitors : submissionOrderCompetitors;
        const rows: (string | number)[][] = [];

        rows.push([`${rankingView.charAt(0).toUpperCase() + rankingView.slice(1)} Rankings`]);
        rows.push([order === 'ranking' ? 'Ordered by Rank (1st to Last)' : 'Ordered by Submission Time']);
        rows.push([`Generated: ${formatDate(new Date().toISOString())}`]);
        rows.push([]);

        if (order === 'ranking') {
            rows.push(['Rank', 'Competitor', 'Judge', 'Score', 'Status', 'Submitted At']);
        } else {
            rows.push(['Submission Order', 'Competitor', 'Judge', 'Score', 'Status', 'Submitted At']);
        }

        competitors.forEach((competitor, index) => {
            const score = competitor.isDisqualified ? 'DQ' :
                (rankingView === 'technical' ?
                    formatScore(competitor.technicalScore) :
                    `${formatScore(competitor.performanceScore)}/30.0`);

            const status = competitor.isDisqualified ? 'Disqualified' : 'Qualified';

            rows.push([
                index + 1,
                competitor.name,
                competitor.judgeName,
                score,
                status,
                formatDate(competitor.submittedAt)
            ]);
        });

        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildRankingTxt = (order: ExportOrder) => {
        const competitors = order === 'ranking' ? rankedCompetitors : submissionOrderCompetitors;
        let txt = `${rankingView.charAt(0).toUpperCase() + rankingView.slice(1)} Rankings\n`;
        txt += `${order === 'ranking' ? 'Ordered by Rank (1st to Last)' : 'Ordered by Submission Time'}\n`;
        txt += `Generated: ${formatDate(new Date().toISOString())}\n\n`;

        // Define column widths
        const colWidths = {
            rank: 5,         // Rank/Order
            competitor: 22,  // Competitor name
            judge: 16,       // Judge name
            score: 14,       // Score
            status: 8        // Status
        };

        // Helper function to pad text to column width
        const padColumn = (text: string, width: number, align: 'left' | 'right' = 'left'): string => {
            const str = String(text || '');
            if (str.length >= width) return str.substring(0, width);
            const padding = width - str.length;
            return align === 'right' ? ' '.repeat(padding) + str : str + ' '.repeat(padding);
        };

        const header = order === 'ranking' ? 'Rank' : 'Order';

        // Create header row
        const headerRow =
            padColumn(header, colWidths.rank) + '| ' +
            padColumn('Competitor', colWidths.competitor) + '| ' +
            padColumn('Judge', colWidths.judge) + '| ' +
            padColumn('Score', colWidths.score) + '| ' +
            padColumn('Status', colWidths.status);

        txt += headerRow + '\n';

        // Calculate total width for separator
        const totalWidth = Object.values(colWidths).reduce((sum, width) => sum + width, 0) +
            (Object.keys(colWidths).length - 1) * 2;
        txt += '-'.repeat(totalWidth) + '\n';

        competitors.forEach((competitor, index) => {
            const score = competitor.isDisqualified ? 'DQ' :
                (rankingView === 'technical' ?
                    formatScore(competitor.technicalScore) :
                    `${formatScore(competitor.performanceScore)}/30.0`);

            const status = competitor.isDisqualified ? 'DQ' : 'OK';

            const line =
                padColumn((index + 1).toString(), colWidths.rank) + '| ' +
                padColumn(competitor.name, colWidths.competitor) + '| ' +
                padColumn(competitor.judgeName, colWidths.judge) + '| ' +
                padColumn(score, colWidths.score) + '| ' +
                padColumn(status, colWidths.status);

            txt += line + '\n';
        });

        return txt;
    };

    const exportRanking = (order: ExportOrder, format: 'csv' | 'txt') => {
        const orderText = order === 'ranking' ? 'ranked' : 'submission_order';
        const filename = `${rankingView}_rankings_${orderText}.${format}`;

        const content = format === 'csv' ? buildRankingCsv(order) : buildRankingTxt(order);
        const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';

        downloadFile(filename, content, mimeType);
    };

    return (
        <>
            <div className="details-header">
                <h2 className="details-title">{getRankingTitle()}</h2>
                <div className="details-total">{rankedCompetitors.length} competitors</div>
            </div>

            <div className="section">
                <div className="section-title">Ranking View:</div>
                <div className="button-row">
                    <button
                        onClick={() => setRankingView('technical')}
                        className={`level-button ${rankingView === 'technical' ? 'level-active' : ''}`}
                    >
                        Technical Rankings
                    </button>
                    <button
                        onClick={() => setRankingView('performance')}
                        className={`level-button ${rankingView === 'performance' ? 'level-active' : ''}`}
                    >
                        Performance Rankings
                    </button>
                </div>
                <div className="selected-features" style={{ marginTop: '8px' }}>
                    {getRankingDescription()}
                </div>
            </div>

            {rankedCompetitors.length > 0 && (
                <div className="section">
                    <div className="section-title">Export Rankings:</div>
                    <div className="button-row" style={{ marginBottom: '8px' }}>
                        <button
                            onClick={() => exportRanking('ranking', 'csv')}
                            className="feature-button feature-active"
                        >
                            Export Ranked CSV (1st to Last)
                        </button>
                        <button
                            onClick={() => exportRanking('ranking', 'txt')}
                            className="feature-button feature-active"
                        >
                            Export Ranked TXT (1st to Last)
                        </button>
                    </div>
                    <div className="button-row">
                        <button
                            onClick={() => exportRanking('submission', 'csv')}
                            className="feature-button"
                        >
                            Export by Submission Order CSV
                        </button>
                        <button
                            onClick={() => exportRanking('submission', 'txt')}
                            className="feature-button"
                        >
                            Export by Submission Order TXT
                        </button>
                    </div>
                </div>
            )}

            {rankedCompetitors.length === 0 ? (
                <div className="section">
                    <div className="no-competitors">
                        {rankingView === 'technical' && 'No technical competitors found.'}
                        {rankingView === 'performance' && 'No performance competitors found.'}
                    </div>
                </div>
            ) : (
                <div className="section">
                    <div className="section-title">Rankings:</div>
                    <div className="details-list">
                        {rankedCompetitors.map((competitor, index) => {
                            const rank = index + 1;
                            const isDQ = competitor.isDisqualified;

                            return (
                                <div key={`${competitor.id}-${rankingView}`}
                                     className={`detail-item ${isDQ ? 'deduction-item-detail' : ''}`}>
                                    <div>
                                        <div className="detail-identifier">
                                            {isDQ ? 'DQ' : rank}. {competitor.name}
                                        </div>
                                        <div className="detail-breakdown">
                                            Judge: {competitor.judgeName} ({competitor.judgeCategory})
                                            {isDQ && ' - DISQUALIFIED'}
                                        </div>
                                    </div>
                                    {getScoreDisplay(competitor, rank)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {rankedCompetitors.length > 0 && (
                <div className="section">
                    <div className="section-title">Scoring System:</div>
                    <div className="selected-features">
                        {rankingView === 'technical' ? (
                            <>
                                • Technical scores are ranked by total points earned
                                <br />
                                • Higher scores rank better
                                <br />
                                • Disqualified competitors receive 0 points and are placed last
                            </>
                        ) : (
                            <>
                                • Performance scores are out of 30 points (6 categories × 5 points each)
                                <br />
                                • Categories: Control, Style, Space Usage, Choreography, Construction, Showmanship
                                <br />
                                • Disqualified competitors receive 0 points and are placed last
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default RankingsTab;