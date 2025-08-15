import React from 'react';
import { Score, SavedCompetitor } from './types';
import { goeLevels, multiplierLevels } from './constants';
import { formatScore, csvEscape, downloadFile } from './utils';

interface ExportSubmitTabProps {
    competitorName: string;
    setCompetitorName: (name: string) => void;
    judgeName: string;
    setJudgeName: (name: string) => void;
    totalScore: number;
    scores: Score[];
    editingCompetitor: SavedCompetitor | null;
    submitFinalScore: () => void;
}

const ExportSubmitTab: React.FC<ExportSubmitTabProps> = ({
                                                             competitorName,
                                                             setCompetitorName,
                                                             judgeName,
                                                             setJudgeName,
                                                             totalScore,
                                                             scores,
                                                             editingCompetitor,
                                                             submitFinalScore
                                                         }) => {
    const buildCsv = () => {
        const rows: (string | number)[][] = [];
        rows.push(['Competitor', competitorName]);
        rows.push(['Judge', judgeName]);
        rows.push([]);
        rows.push(['#', 'Identifier', 'Trick', 'Difficulty', 'Base', 'Features', 'GOE', 'Multiplier Level', 'Final']);
        scores.forEach((s, i) => {
            rows.push([
                i + 1,
                s.identifier,
                s.trick,
                s.difficulty,
                s.baseScore,
                s.features.map(f => f.abbrev).join(', '),
                s.goeLevel >= 0 ? `+${s.goeLevel}` : `${s.goeLevel}`,
                s.multiplierLevel ?? '',
                formatScore(s.finalScore)
            ]);
        });
        rows.push([]);
        rows.push(['Total', '', '', '', '', '', '', '', formatScore(totalScore)]);
        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildTxt = () => {
        let txt = '';
        txt += `Competitor: ${competitorName}\n`;
        txt += `Judge: ${judgeName}\n`;
        txt += `Total: ${formatScore(totalScore)}\n\n`;
        txt += `#  Identifier     | Trick (Diff)                | Base  | Features      | GOE | Mult | Final\n`;
        txt += `--------------------------------------------------------------------------------------------\n`;
        scores.forEach((s, i) => {
            const line =
                `${String(i + 1).padEnd(3)}` +
                `${s.identifier.padEnd(15)}| ` +
                `${`${s.trick} (${s.difficulty})`.padEnd(25)}| ` +
                `${String(s.baseScore).padEnd(5)} | ` +
                `${s.features.map(f => f.abbrev).join(', ').padEnd(13)}| ` +
                `${(s.goeLevel >= 0 ? `+${s.goeLevel}` : s.goeLevel).toString().padEnd(3)} | ` +
                `${(s.multiplierLevel ?? '').toString().padEnd(5)}| ` +
                `${formatScore(s.finalScore)}`;
            txt += line + '\n';
        });
        return txt;
    };

    const onExportCsv = () => {
        if (!judgeName.trim()) {
            alert('Please enter judge name before exporting');
            return;
        }
        const filename = `${competitorName || 'scores'}.csv`;
        downloadFile(filename, buildCsv(), 'text/csv;charset=utf-8');
    };

    const onExportTxt = () => {
        if (!judgeName.trim()) {
            alert('Please enter judge name before exporting');
            return;
        }
        const filename = `${competitorName || 'scores'}.txt`;
        downloadFile(filename, buildTxt(), 'text/plain;charset=utf-8');
    };

    const canSubmitOrExport = competitorName.trim() && judgeName.trim() && scores.length > 0;

    return (
        <>
            <div className="details-header">
                <h2 className="details-title">Export / Submit</h2>
                <div className="details-total">Total: {formatScore(totalScore)}</div>
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
                <button
                    className="submit-final-button"
                    onClick={submitFinalScore}
                    disabled={!canSubmitOrExport}
                    title={
                        !competitorName.trim() ? 'Enter competitor name to submit' :
                            !judgeName.trim() ? 'Enter judge name to submit' :
                                (scores.length === 0 ? 'No scores to submit' : 'Submit final score and save competitor')
                    }
                >
                    {editingCompetitor ? 'Update Final Score & Save Changes' : 'Submit Final Score & Save Competitor'}
                </button>
            </div>

            <div className="section">
                <div className="section-title">Export format:</div>
                <div className="button-row">
                    <button
                        className="level-button"
                        onClick={onExportCsv}
                        disabled={!canSubmitOrExport}
                        title={
                            !competitorName.trim() ? 'Enter competitor name to enable export' :
                                !judgeName.trim() ? 'Enter judge name to enable export' :
                                    (scores.length === 0 ? 'No scores to export' : 'Export CSV')
                        }
                    >
                        Export CSV (Excel)
                    </button>
                    <button
                        className="level-button"
                        onClick={onExportTxt}
                        disabled={!canSubmitOrExport}
                        title={
                            !competitorName.trim() ? 'Enter competitor name to enable export' :
                                !judgeName.trim() ? 'Enter judge name to enable export' :
                                    (scores.length === 0 ? 'No scores to export' : 'Export TXT')
                        }
                    >
                        Export TXT
                    </button>
                </div>
            </div>
        </>
    );
};

export default ExportSubmitTab;