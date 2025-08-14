import React, { useState } from 'react';
import './App.css';

interface Feature {
    name: string;
    abbrev: string;
    multiplier?: number;
    points?: number;
    type: string;
}

interface Score {
    id: number;
    trick: string;
    difficulty: string;
    baseScore: number;
    features: Feature[];
    goeLevel: number;
    multiplierLevel: number | null;
    finalScore: number;
    description: string;
    identifier: string;
}

const tricks = [
    { name: 'Shuffle', abbrev: '#', scores: { '1D': 0, '2D': 0.7, '3D': 6, '4D': 15, 'VD': 0 } },
    { name: 'Toss/High', abbrev: 'T', scores: { '1D': 0.1, '2D': 1, '3D': 6, '4D': 12, 'VD': 0.2 } },
    { name: 'Orbit', abbrev: 'O', scores: { '1D': 0.2, '2D': 1.2, '3D': 4, '4D': 8, 'VD': 0.5 } },
    { name: 'Feed the sun', abbrev: 'F', scores: { '1D': 0, '2D': 1.5, '3D': 5, '4D': 10, 'VD': 0 } },
    { name: 'Swing/Sun', abbrev: 'S', scores: { '1D': 0.1, '2D': 1, '3D': 6, '4D': 12, 'VD': 0.2 } },
    { name: 'Whip', abbrev: 'W', scores: { '1D': 0.2, '2D': 0, '3D': 0, '4D': 0, 'VD': 0.4 } },
    { name: 'Stick Release/Gen', abbrev: 'R', scores: { '1D': 0.4, '2D': 1.2, '3D': 6, '4D': 12, 'VD': 1 } }
];

const features: Feature[] = [
    { name: 'Turn 360', abbrev: 'T1', multiplier: 1.7, type: 'turn' },
    { name: 'Turn 720', abbrev: 'T2', multiplier: 3.0, type: 'turn' },
    { name: 'Turn 1080', abbrev: 'T3', multiplier: 5.0, type: 'turn' },
    { name: 'Acro', abbrev: 'A', points: 0.2, type: 'acro' }
];

const multiplierLevels: Record<number, number> = {
    1: 2, 2: 4, 3: 6, 4: 8, 5: 10
};

const goeLevels: Record<number, number> = {
    [-3]: 0.7,
    [-2]: 0.8,
    [-1]: 0.9,
    [0]: 1.0,
    [1]: 1.05,
    [2]: 1.1,
    [3]: 1.15
};

const App = () => {
    const [scores, setScores] = useState<Score[]>([]);
    const [totalScore, setTotalScore] = useState(0);
    const [competitorName, setCompetitorName] = useState('');
    const [multiplierLevel, setMultiplierLevel] = useState<number | null>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
    const [goeLevel, setGoeLevel] = useState(0);
    const [activeTab, setActiveTab] = useState<'scoring' | 'details' | 'export'>('scoring');

    const addTrick = (trickName: string, difficulty: string, baseScore: number) => {
        let finalScore = baseScore;
        let description = `${tricks.find(t => t.name === trickName)?.abbrev}(${difficulty})`;
        let identifier = tricks.find(t => t.name === trickName)?.abbrev || '';

        selectedFeatures.forEach(feature => {
            identifier += feature.abbrev;
            if (feature.points) {
                finalScore += feature.points;
                description += `+${feature.abbrev}`;
            } else if (feature.multiplier) {
                finalScore *= feature.multiplier;
                description += `*${feature.abbrev}`;
            }
        });

        const goeMultiplier = goeLevels[goeLevel] ?? 1.0;
        finalScore *= goeMultiplier;
        if (goeLevel !== 0) {
            identifier += `G${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
            description += `*G${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
        }

        const multiplier = multiplierLevel ? multiplierLevels[multiplierLevel] : 1;
        if (multiplierLevel) {
            identifier += `M${multiplierLevel}`;
            finalScore *= multiplier;
            description += `×${multiplier}`;
        }

        const newScore: Score = {
            id: Date.now(),
            trick: trickName,
            difficulty,
            baseScore,
            features: [...selectedFeatures],
            goeLevel,
            multiplierLevel,
            finalScore,
            description,
            identifier
        };

        setScores([...scores, newScore]);
        setTotalScore(totalScore + finalScore);

        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    const removeScore = (scoreId: number) => {
        const scoreToRemove = scores.find(s => s.id === scoreId);
        if (scoreToRemove) {
            setScores(scores.filter(s => s.id !== scoreId));
            setTotalScore(totalScore - scoreToRemove.finalScore);
        }
    };

    const resetScores = () => {
        setScores([]);
        setTotalScore(0);
        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case '1D': return 'difficulty-1d';
            case '2D': return 'difficulty-2d';
            case '3D': return 'difficulty-3d';
            case '4D': return 'difficulty-4d';
            case 'VD': return 'difficulty-vd';
            default: return 'difficulty-default';
        }
    };

    const toggleFeature = (feature: Feature) => {
        if (feature.type === 'turn') {
            const otherTurns = selectedFeatures.filter(f => f.type !== 'turn');
            const isCurrentlySelected = selectedFeatures.find(f => f.name === feature.name);

            if (isCurrentlySelected) {
                setSelectedFeatures(otherTurns);
            } else {
                setSelectedFeatures([...otherTurns, feature]);
            }
        } else {
            if (selectedFeatures.find(f => f.name === feature.name)) {
                setSelectedFeatures(selectedFeatures.filter(f => f.name !== feature.name));
            } else {
                setSelectedFeatures([...selectedFeatures, feature]);
            }
        }
    };

    const toggleMultiplier = (level: number) => {
        if (multiplierLevel === level) {
            setMultiplierLevel(null);
        } else {
            setMultiplierLevel(level);
        }
    };

    // -------- EXPORT HELPERS (CSV & TXT) ----------
    const csvEscape = (val: any) => {
        const s = String(val ?? '');
        if (/[",\n]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
        // Note: Excel opens CSV files seamlessly.
    };

    const downloadFile = (filename: string, content: string, mime: string) => {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 0);
    };

    const buildCsv = () => {
        const rows: (string | number)[][] = [];
        rows.push(['Competitor', competitorName]);
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
                s.finalScore.toFixed(1)
            ]);
        });
        rows.push([]);
        rows.push(['Total', '', '', '', '', '', '', '', totalScore.toFixed(1)]);
        return rows.map(r => r.map(csvEscape).join(',')).join('\n');
    };

    const buildTxt = () => {
        let txt = '';
        txt += `Competitor: ${competitorName}\n`;
        txt += `Total: ${totalScore.toFixed(1)}\n\n`;
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
                `${s.finalScore.toFixed(1)}`;
            txt += line + '\n';
        });
        return txt;
    };

    const onExportCsv = () => {
        const filename = `${competitorName || 'scores'}.csv`;
        downloadFile(filename, buildCsv(), 'text/csv;charset=utf-8');
    };

    const onExportTxt = () => {
        const filename = `${competitorName || 'scores'}.txt`;
        downloadFile(filename, buildTxt(), 'text/plain;charset=utf-8');
    };
    // -----------------------------------------------

    return (
        <div className="app-container">
            <div className="app-content">
                <div className="app-card">
                    <h1 className="app-title">Diabolo Scoring</h1>

                    {/* Tab Navigation */}
                    <div className="tab-nav">
                        <button
                            onClick={() => setActiveTab('scoring')}
                            className={`tab-button ${activeTab === 'scoring' ? 'tab-active' : ''}`}
                        >
                            Scoring
                        </button>
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`tab-button ${activeTab === 'details' ? 'tab-active' : ''}`}
                        >
                            Score Details
                        </button>
                        {/* NEW: Export tab */}
                        <button
                            onClick={() => setActiveTab('export')}
                            className={`tab-button ${activeTab === 'export' ? 'tab-active' : ''}`}
                        >
                            Export / Submit
                        </button>
                    </div>

                    {activeTab === 'scoring' ? (
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
                                <div className="score-display">
                                    <div className="score-value">{totalScore.toFixed(1)}</div>
                                </div>
                            </div>

                            {/* GOE Selector */}
                            <div className="section">
                                <div className="section-title">GOE - Grade of Execution (×{goeLevels[goeLevel]}):</div>
                                <div className="button-row">
                                    {[-3, -2, -1, 0, 1, 2, 3].map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setGoeLevel(level)}
                                            className={`level-button ${goeLevel === level ? 'goe-active' : ''}`}
                                        >
                                            {level >= 0 ? '+' : ''}{level} ({Math.round((goeLevels[level] - 1) * 100)}%)
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Multiplier Level Selector */}
                            <div className="section">
                                <div className="section-title">
                                    Multiplier Level {multiplierLevel ? `(×${multiplierLevels[multiplierLevel]})` : '(×1)'}:
                                </div>
                                <div className="button-row">
                                    {[1, 2, 3, 4, 5].map(level => (
                                        <button
                                            key={level}
                                            onClick={() => toggleMultiplier(level)}
                                            className={`level-button ${multiplierLevel === level ? 'level-active' : ''}`}
                                        >
                                            {level} (×{multiplierLevels[level]})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feature Selector */}
                            <div className="section">
                                <div className="section-title">Features:</div>
                                <div className="button-row">
                                    {features.map(feature => (
                                        <button
                                            key={feature.name}
                                            onClick={() => toggleFeature(feature)}
                                            className={`feature-button ${selectedFeatures.find(f => f.name === feature.name) ? 'feature-active' : ''}`}
                                        >
                                            {feature.abbrev} {feature.multiplier ? `(×${feature.multiplier})` : `(+${feature.points})`}
                                        </button>
                                    ))}
                                </div>
                                {selectedFeatures.length > 0 && (
                                    <div className="selected-features">
                                        Selected: {selectedFeatures.map(f => f.abbrev).join(', ')}
                                    </div>
                                )}
                            </div>

                            {/* Tricks Grid */}
                            <div className="tricks-grid">
                                {tricks.map((trick) => (
                                    <div key={trick.name} className="trick-row">
                                        <div className="trick-label">{trick.abbrev}</div>
                                        <div className="trick-buttons">
                                            {Object.entries(trick.scores).map(([difficulty, score]) => {
                                                if (score === 0) return <div key={difficulty}></div>;

                                                return (
                                                    <button
                                                        key={difficulty}
                                                        onClick={() => addTrick(trick.name, difficulty, score)}
                                                        className={`trick-button ${getDifficultyColor(difficulty)}`}
                                                    >
                                                        <div className="difficulty-label">{difficulty}</div>
                                                        <div className="score-label">{score}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Scores */}
                            {scores.length > 0 && (
                                <div className="section">
                                    <div className="section-title">Recent Scores:</div>
                                    <div className="recent-scores">
                                        {scores.slice(-10).map((score) => (
                                            <button
                                                key={score.id}
                                                onClick={() => removeScore(score.id)}
                                                className="remove-button"
                                                title={`Remove: ${score.finalScore.toFixed(1)} pts`}
                                            >
                                                -{score.description} ({score.finalScore.toFixed(1)})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reset */}
                            <div className="reset-section">
                                <button onClick={resetScores} className="reset-button">
                                    Reset
                                </button>
                            </div>
                        </>
                    ) : activeTab === 'details' ? (
                        <>
                            {/* Score Details Tab */}
                            <div className="details-header">
                                <h2 className="details-title">Detailed Score Breakdown</h2>
                                <div className="details-total">Total: {totalScore.toFixed(1)}</div>
                            </div>

                            {competitorName && (
                                <div className="competitor-name">Competitor: {competitorName}</div>
                            )}

                            <div className="details-list">
                                {scores.map((score, index) => (
                                    <div key={score.id} className="detail-item">
                                        <div>
                                            <div className="detail-identifier">
                                                {index + 1}. {score.identifier}
                                            </div>
                                            <div className="detail-breakdown">
                                                {score.trick} ({score.difficulty}) - Base: {score.baseScore}
                                                {score.features.length > 0 && ` + Features: ${score.features.map((f: any) => f.abbrev).join(', ')}`}
                                                {score.multiplierLevel && ` × Multiplier Level ${score.multiplierLevel}`}
                                            </div>
                                        </div>
                                        <div className="detail-score">
                                            <div className="detail-points">{score.finalScore.toFixed(1)}</div>
                                            <button
                                                onClick={() => removeScore(score.id)}
                                                className="detail-remove"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {scores.length === 0 && (
                                    <div className="no-scores">
                                        No scores recorded yet. Switch to the Scoring tab to add tricks.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // -------- NEW EXPORT TAB (requires competitor name) --------
                        <>
                            <div className="details-header">
                                <h2 className="details-title">Export / Submit</h2>
                                <div className="details-total">Total: {totalScore.toFixed(1)}</div>
                            </div>

                            <div className="section">
                                <div className="section-title">Competitor name (required to export):</div>
                                <input
                                    type="text"
                                    value={competitorName}
                                    onChange={(e) => setCompetitorName(e.target.value)}
                                    className="competitor-input"
                                    placeholder="Competitor Name"
                                />
                            </div>

                            <div className="section">
                                <div className="section-title">Export format:</div>
                                <div className="button-row">
                                    <button
                                        className="level-button"
                                        onClick={onExportCsv}
                                        disabled={!competitorName.trim() || scores.length === 0}
                                        title={!competitorName.trim() ? 'Enter competitor name to enable export' : (scores.length === 0 ? 'No scores to export' : 'Export CSV')}
                                    >
                                        Export CSV (Excel)
                                    </button>
                                    <button
                                        className="level-button"
                                        onClick={onExportTxt}
                                        disabled={!competitorName.trim() || scores.length === 0}
                                        title={!competitorName.trim() ? 'Enter competitor name to enable export' : (scores.length === 0 ? 'No scores to export' : 'Export TXT')}
                                    >
                                        Export TXT
                                    </button>
                                </div>
                            </div>
                        </>
                        // -----------------------------------------------------------
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
