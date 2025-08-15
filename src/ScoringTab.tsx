import React, { useState, useEffect, useRef } from 'react';
import { Feature, Score, SavedCompetitor, JudgeCategory } from './types';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';
import { formatScore, getDifficultyColor } from './utils';
import HotkeyManager, { HotkeyConfig } from './HotkeyManager';

interface ScoringTabProps {
    competitorName: string;
    setCompetitorName: (name: string) => void;
    judgeName: string;
    setJudgeName: (name: string) => void;
    judgeCategory: JudgeCategory;
    setJudgeCategory: (category: JudgeCategory) => void;
    totalScore: number;
    scores: Score[];
    editingCompetitor: SavedCompetitor | null;
    selectedTrick: {name: string, difficulty: string, baseScore: number} | null;
    selectedDeductions: {name: string, points: number, abbrev: string}[];
    selectedFeatures: Feature[];
    goeLevel: number;
    multiplierLevel: number | null;
    showPoints: boolean;
    isAdmin: boolean;
    isDisqualified: boolean;
    setIsDisqualified: (dq: boolean) => void;
    selectTrick: (trickName: string, difficulty: string, baseScore: number) => void;
    selectDeduction: (deduction: {name: string, points: number, abbrev: string}) => void;
    setGoeLevel: (level: number) => void;
    toggleMultiplier: (level: number) => void;
    toggleFeature: (feature: Feature) => void;
    getPreviewScore: () => number;
    submitScore: () => void;
    removeScore: (scoreId: number) => void;
    resetScores: () => void;
    cancelEdit: () => void;
    submitFinalScore: () => void;
}

const ScoringTab: React.FC<ScoringTabProps> = ({
                                                   competitorName,
                                                   setCompetitorName,
                                                   judgeName,
                                                   setJudgeName,
                                                   judgeCategory,
                                                   setJudgeCategory,
                                                   totalScore,
                                                   scores,
                                                   editingCompetitor,
                                                   selectedTrick,
                                                   selectedDeductions,
                                                   selectedFeatures,
                                                   goeLevel,
                                                   multiplierLevel,
                                                   showPoints,
                                                   isAdmin,
                                                   isDisqualified,
                                                   setIsDisqualified,
                                                   selectTrick,
                                                   selectDeduction,
                                                   setGoeLevel,
                                                   toggleMultiplier,
                                                   toggleFeature,
                                                   getPreviewScore,
                                                   submitScore,
                                                   removeScore,
                                                   resetScores,
                                                   cancelEdit,
                                                   submitFinalScore
                                               }) => {
    const [showHotkeyManager, setShowHotkeyManager] = useState(false);
    const [hotkeys, setHotkeys] = useState<HotkeyConfig>({
        tricks: {},
        levels: {},
        features: {},
        execution: {},
        deductions: {}
    });
    const [hotkeyEnabled, setHotkeyEnabled] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load hotkeys from localStorage on mount
    useEffect(() => {
        const savedHotkeys = localStorage.getItem('diabolo-hotkeys');
        const savedEnabled = localStorage.getItem('diabolo-hotkeys-enabled');

        if (savedHotkeys) {
            try {
                const parsedHotkeys = JSON.parse(savedHotkeys);
                setHotkeys(parsedHotkeys);
                console.log('Loaded hotkeys from localStorage:', parsedHotkeys);
            } catch (error) {
                console.error('Error loading hotkeys:', error);
                // Reset to default if corrupted
                localStorage.removeItem('diabolo-hotkeys');
            }
        }

        if (savedEnabled !== null) {
            setHotkeyEnabled(savedEnabled === 'true');
        }
    }, []);

    // Save hotkeys to localStorage
    const saveHotkeys = (newHotkeys: HotkeyConfig) => {
        setHotkeys(newHotkeys);
        localStorage.setItem('diabolo-hotkeys', JSON.stringify(newHotkeys));
        console.log('Saved hotkeys to localStorage:', newHotkeys);
    };

    // Save hotkey enabled state
    const toggleHotkeys = () => {
        const newEnabled = !hotkeyEnabled;
        setHotkeyEnabled(newEnabled);
        localStorage.setItem('diabolo-hotkeys-enabled', newEnabled.toString());
        console.log('Hotkeys enabled:', newEnabled);
    };

    // Handle keyboard events
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Don't process hotkeys if:
            // - Hotkeys are disabled
            // - User is typing in an input field
            // - Competitor is disqualified
            // - Hotkey manager is open
            if (!hotkeyEnabled ||
                isDisqualified ||
                showHotkeyManager ||
                (e.target as HTMLElement)?.tagName === 'INPUT' ||
                (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
                return;
            }

            const key = e.key.toLowerCase();

            // Check for trick hotkeys
            if (hotkeys.tricks[key]) {
                e.preventDefault();
                const trickData = hotkeys.tricks[key];
                selectTrick(trickData.name, trickData.difficulty, trickData.baseScore);
                return;
            }

            // Check for level hotkeys
            if (hotkeys.levels[key]) {
                e.preventDefault();
                toggleMultiplier(hotkeys.levels[key]);
                return;
            }

            // Check for feature hotkeys
            if (hotkeys.features[key]) {
                e.preventDefault();
                const featureName = hotkeys.features[key];
                const feature = features.find(f => f.name === featureName);
                if (feature) {
                    toggleFeature(feature);
                }
                return;
            }

            // Check for execution hotkeys
            if (hotkeys.execution[key]) {
                e.preventDefault();
                setGoeLevel(hotkeys.execution[key]);
                return;
            }

            // Check for deduction hotkeys
            if (hotkeys.deductions[key]) {
                e.preventDefault();
                const deduction = hotkeys.deductions[key];
                selectDeduction(deduction);
                return;
            }

            // Special hotkeys
            switch (key) {
                case 'enter':
                    if (selectedTrick || selectedDeductions.length > 0) {
                        e.preventDefault();
                        submitScore();
                    }
                    break;
                case 'escape':
                    // Clear all selections
                    if (selectedTrick || selectedDeductions.length > 0 || selectedFeatures.length > 0 ||
                        goeLevel !== 0 || multiplierLevel !== null) {
                        e.preventDefault();
                        // Reset current selections without affecting saved scores
                        setGoeLevel(0);
                        // Fix: Only toggle multiplier if it's not null
                        if (multiplierLevel !== null) {
                            toggleMultiplier(multiplierLevel); // This will clear it
                        }
                        selectedFeatures.forEach(f => toggleFeature(f)); // Clear all features
                        selectedDeductions.forEach(d => selectDeduction(d)); // Clear all deductions
                        if (selectedTrick) {
                            selectTrick(selectedTrick.name, selectedTrick.difficulty, selectedTrick.baseScore); // Clear trick
                        }
                    }
                    break;
            }
        };

        if (containerRef.current) {
            containerRef.current.addEventListener('keydown', handleKeyPress);
            containerRef.current.focus(); // Make sure the container can receive focus
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('keydown', handleKeyPress);
            }
        };
    }, [hotkeyEnabled, isDisqualified, showHotkeyManager, hotkeys, selectedTrick, selectedDeductions, selectedFeatures, goeLevel, multiplierLevel]);

    // Get hotkey display for buttons
    const getHotkeyForTrick = (trickName: string, difficulty: string): string | null => {
        for (const [key, value] of Object.entries(hotkeys.tricks)) {
            if (value.name === trickName && value.difficulty === difficulty) {
                return key.toUpperCase();
            }
        }
        return null;
    };

    const getHotkeyForLevel = (level: number): string | null => {
        for (const [key, value] of Object.entries(hotkeys.levels)) {
            if (value === level) {
                return key.toUpperCase();
            }
        }
        return null;
    };

    const getHotkeyForFeature = (featureName: string): string | null => {
        for (const [key, value] of Object.entries(hotkeys.features)) {
            if (value === featureName) {
                return key.toUpperCase();
            }
        }
        return null;
    };

    const getHotkeyForExecution = (level: number): string | null => {
        for (const [key, value] of Object.entries(hotkeys.execution)) {
            if (value === level) {
                return key.toUpperCase();
            }
        }
        return null;
    };

    const getHotkeyForDeduction = (deductionName: string): string | null => {
        for (const [key, value] of Object.entries(hotkeys.deductions)) {
            if (value.name === deductionName) {
                return key.toUpperCase();
            }
        }
        return null;
    };

    const canSaveCompetitor = competitorName.trim() && judgeName.trim() && (scores.length > 0 || isDisqualified);

    const handleSubmitFinalScore = () => {
        setJudgeCategory('technical');
        submitFinalScore();
    };

    const displayScore = isDisqualified ? 'DQ' : (showPoints ? formatScore(totalScore) : '***');

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            style={{ display: 'flex', gap: '16px', outline: 'none' }}
        >
            {/* Left Side - Recent Scores - Narrower */}
            <div className="recent-scores-panel" style={{ flex: '0 0 220px' }}>
                {scores.length > 0 && (
                    <div className="section">
                        <div className="section-title">Trick Sequence ({scores.length})</div>
                        <div className="recent-scores-list" style={{
                            maxHeight: '350px',
                            overflowY: 'auto',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '6px'
                        }}>
                            {scores.map((score, index) => (
                                <div
                                    key={score.id}
                                    className={`recent-score-item ${score.difficulty === 'DEDUCTION' ? 'deduction-item' : ''}`}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px',
                                        marginBottom: '3px',
                                        backgroundColor: score.difficulty === 'DEDUCTION' ? '#fef2f2' : '#f9fafb',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>
                                            {index + 1}. {score.identifier}
                                        </div>
                                        {showPoints && (
                                            <div style={{
                                                fontSize: '11px',
                                                color: '#6b7280',
                                                marginTop: '1px'
                                            }}>
                                                {formatScore(score.finalScore)} pts
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeScore(score.id)}
                                        className="remove-button"
                                        style={{
                                            background: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            padding: '3px 6px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            marginLeft: '6px'
                                        }}
                                        title={`Remove: ${score.identifier}`}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="selected-features" style={{ marginTop: '6px', fontSize: '11px' }}>
                            Order: Trick → Level (L) → Features → Execution (E) → Deductions
                        </div>
                    </div>
                )}

                {/* Reset Button moved to left panel */}
                <div className="section">
                    <button onClick={resetScores} className="reset-button" disabled={isDisqualified}>
                        Reset Technical Scores
                    </button>
                </div>
            </div>

            {/* Right Side - Main Scoring Interface */}
            <div style={{ flex: 1 }}>
                {/* Competitor Info & Score */}
                <div className="competitor-section">
                    <input
                        type="text"
                        value={competitorName}
                        onChange={(e) => setCompetitorName(e.target.value)}
                        className="competitor-input"
                        placeholder="Competitor Name"
                    />
                    <div className={`score-display ${isDisqualified ? 'score-disqualified' : ''}`}>
                        <div className="score-value" style={isDisqualified ? {color: '#dc2626'} : {}}>
                            {displayScore}
                        </div>
                    </div>
                </div>

                {/* Judge Info Section */}
                <div className="section">
                    <input
                        type="text"
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        className="competitor-input judge-input"
                        placeholder="Judge Name"
                    />
                </div>

                {/* DQ Toggle */}
                <div className="section">
                    <div className="section-title">Competitor Status:</div>
                    <div className="button-row">
                        <button
                            onClick={() => setIsDisqualified(!isDisqualified)}
                            className={`level-button ${isDisqualified ? 'level-active' : ''}`}
                            style={isDisqualified ? {backgroundColor: '#dc2626', color: 'white'} : {}}
                        >
                            {isDisqualified ? 'DISQUALIFIED (Click to Restore)' : 'Disqualify Competitor'}
                        </button>
                    </div>
                    {isDisqualified && (
                        <div className="selected-features" style={{color: '#dc2626'}}>
                            ⚠️ This competitor is disqualified and will receive 0 points regardless of scores entered.
                        </div>
                    )}
                </div>

                {/* Show cancel edit button if editing */}
                {editingCompetitor && (
                    <div className="section">
                        <button onClick={cancelEdit} className="cancel-edit-button">
                            Cancel Edit & Restore Original
                        </button>
                    </div>
                )}

                {/* Save Competitor Button */}
                <div className="section">
                    <button
                        className="submit-final-button"
                        onClick={handleSubmitFinalScore}
                        disabled={!canSaveCompetitor}
                        title={
                            !competitorName.trim() ? 'Enter competitor name to save' :
                                !judgeName.trim() ? 'Enter judge name to save' :
                                    (scores.length === 0 && !isDisqualified ? 'No technical scores to save or DQ competitor' : 'Save competitor with technical scores')
                        }
                    >
                        {editingCompetitor ? 'Update Technical Competitor' : 'Save Technical Competitor'}
                        {isDisqualified && ' (DISQUALIFIED)'}
                    </button>
                </div>

                {/* Tricks Grid and Major Deductions - Disabled if DQ */}
                <div className={`tricks-and-deductions ${isDisqualified ? 'disabled' : ''}`}>
                    <div className="tricks-grid">
                        {tricks.map((trick) => (
                            <div key={trick.name} className="trick-row">
                                <div className="trick-label">{trick.abbrev}</div>
                                <div className="trick-buttons">
                                    {Object.entries(trick.scores).map(([difficulty, score]) => {
                                        if (score === 0) return <div key={difficulty}></div>;

                                        const isSelected = selectedTrick?.name === trick.name && selectedTrick?.difficulty === difficulty;
                                        const hotkey = getHotkeyForTrick(trick.name, difficulty);

                                        return (
                                            <button
                                                key={difficulty}
                                                onClick={() => !isDisqualified && selectTrick(trick.name, difficulty, score)}
                                                className={`trick-button ${getDifficultyColor(difficulty)} ${isSelected ? 'trick-selected' : ''} ${isDisqualified ? 'disabled' : ''}`}
                                                disabled={isDisqualified}
                                                title={hotkey ? `Hotkey: ${hotkey}` : undefined}
                                            >
                                                <div className="difficulty-label">
                                                    {difficulty}
                                                    {hotkey && hotkeyEnabled && <div style={{fontSize: '9px', color: '#666'}}>{hotkey}</div>}
                                                </div>
                                                {showPoints && <div className="score-label">{formatScore(score)}</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="major-deductions">
                        <div className="section-title">Major Deductions</div>
                        {majorDeductions.map((deduction) => {
                            const isSelected = selectedDeductions.find(d => d.name === deduction.name);
                            const hotkey = getHotkeyForDeduction(deduction.name);

                            return (
                                <button
                                    key={deduction.name}
                                    onClick={() => !isDisqualified && selectDeduction(deduction)}
                                    className={`deduction-button-selectable ${isSelected ? 'deduction-selected' : ''} ${isDisqualified ? 'disabled' : ''}`}
                                    disabled={isDisqualified}
                                    title={hotkey ? `Hotkey: ${hotkey}` : undefined}
                                >
                                    <div className="deduction-name">
                                        {deduction.name}
                                        {hotkey && hotkeyEnabled && <span style={{fontSize: '11px', color: '#666', marginLeft: '4px'}}>({hotkey})</span>}
                                    </div>
                                    {showPoints && <div className="deduction-value">{deduction.points}</div>}
                                    <div className="deduction-abbrev">{deduction.abbrev}</div>
                                </button>
                            );
                        })}
                        {selectedDeductions.length > 0 && (
                            <div className="selected-features" style={{ marginTop: '8px' }}>
                                Selected: {selectedDeductions.map(d => d.abbrev).join(', ')}
                                {showPoints && ` (${formatScore(selectedDeductions.reduce((sum, d) => sum + d.points, 0))})`}
                            </div>
                        )}
                    </div>
                </div>

                {/* Level Selector FIRST - Disabled if DQ */}
                <div className={`section ${isDisqualified ? 'disabled' : ''}`}>
                    <div className="section-title">
                        Level{showPoints && (multiplierLevel ? `(×${multiplierLevels[multiplierLevel]})` : '(×1)')}:
                    </div>
                    <div className="button-row">
                        {[1, 2, 3, 4, 5].map(level => {
                            const hotkey = getHotkeyForLevel(level);
                            return (
                                <button
                                    key={level}
                                    onClick={() => !isDisqualified && toggleMultiplier(level)}
                                    className={`level-button ${multiplierLevel === level ? 'level-active' : ''} ${isDisqualified ? 'disabled' : ''}`}
                                    disabled={isDisqualified}
                                    title={hotkey ? `Hotkey: ${hotkey}` : undefined}
                                >
                                    L{level}
                                    {hotkey && hotkeyEnabled && <div style={{fontSize: '9px', color: '#666'}}>{hotkey}</div>}
                                    {showPoints && ` (×${multiplierLevels[level]})`}
                                </button>
                            );
                        })}
                    </div>
                    {multiplierLevel && (
                        <div className="selected-features">
                            Selected Level: L{multiplierLevel} {showPoints && `(×${multiplierLevels[multiplierLevel]})`}
                        </div>
                    )}
                </div>

                {/* Feature Selector SECOND - Disabled if DQ */}
                <div className={`section ${isDisqualified ? 'disabled' : ''}`}>
                    <div className="section-title">Features:</div>
                    <div className="button-row">
                        {features.map(feature => {
                            const hotkey = getHotkeyForFeature(feature.name);
                            return (
                                <button
                                    key={feature.name}
                                    onClick={() => !isDisqualified && toggleFeature(feature)}
                                    className={`feature-button ${selectedFeatures.find(f => f.name === feature.name) ? 'feature-active' : ''} ${isDisqualified ? 'disabled' : ''}`}
                                    disabled={isDisqualified}
                                    title={hotkey ? `Hotkey: ${hotkey}` : undefined}
                                >
                                    {feature.abbrev}
                                    {hotkey && hotkeyEnabled && <div style={{fontSize: '9px', color: '#666'}}>{hotkey}</div>}
                                    {showPoints && (feature.multiplier ? ` (×${feature.multiplier})` : ` (+${feature.points})`)}
                                </button>
                            );
                        })}
                    </div>
                    {selectedFeatures.length > 0 && (
                        <div className="selected-features">
                            Selected: {selectedFeatures.map(f => f.abbrev).join(', ')}
                        </div>
                    )}
                </div>

                {/* Execution Selector THIRD - Disabled if DQ */}
                <div className={`section ${isDisqualified ? 'disabled' : ''}`}>
                    <div className="section-title">
                        Execution{showPoints && `(×${goeLevels[goeLevel]})`}:
                    </div>
                    <div className="button-row">
                        {[-3, -2, -1, 0, 1, 2, 3].map(level => {
                            const hotkey = getHotkeyForExecution(level);
                            return (
                                <button
                                    key={level}
                                    onClick={() => !isDisqualified && setGoeLevel(level)}
                                    className={`level-button ${goeLevel === level ? 'goe-active' : ''} ${isDisqualified ? 'disabled' : ''}`}
                                    disabled={isDisqualified}
                                    title={hotkey ? `Hotkey: ${hotkey}` : undefined}
                                >
                                    E{level >= 0 ? '+' : ''}{level}
                                    {hotkey && hotkeyEnabled && <div style={{fontSize: '9px', color: '#666'}}>{hotkey}</div>}
                                    {showPoints && ` (${Math.round((goeLevels[level] - 1) * 100)}%)`}
                                </button>
                            );
                        })}
                    </div>
                    {goeLevel !== 0 && (
                        <div className="selected-features">
                            Selected Execution: E{goeLevel >= 0 ? '+' : ''}{goeLevel} {showPoints && `(×${goeLevels[goeLevel]})`}
                        </div>
                    )}
                </div>

                {/* Submit Section - Disabled if DQ - Keep at bottom but before hotkeys */}
                {!isDisqualified && (
                    <div className="section">
                        <div className="section-title">
                            Submit Score {selectedTrick && `- ${selectedTrick.name} (${selectedTrick.difficulty})`}
                            {selectedDeductions.length > 0 && `- ${selectedDeductions.map(d => d.abbrev).join(', ')}`}
                            {showPoints && (selectedTrick || selectedDeductions.length > 0) && ` - Preview: ${formatScore(getPreviewScore())}`}
                        </div>
                        <button
                            onClick={submitScore}
                            className={`submit-button ${(selectedTrick || selectedDeductions.length > 0) ? 'submit-ready' : ''}`}
                            disabled={!selectedTrick && selectedDeductions.length === 0}
                        >
                            {(selectedTrick || selectedDeductions.length > 0) ?
                                (showPoints ? `Submit Score (${formatScore(getPreviewScore())})` : 'Submit Score') :
                                'Select a trick or deduction first'
                            }
                            {hotkeyEnabled && (selectedTrick || selectedDeductions.length > 0) &&
                                <span style={{fontSize: '11px', marginLeft: '8px'}}>(ENTER)</span>
                            }
                        </button>
                    </div>
                )}

                {/* Hotkey Controls - MOVED TO THE VERY BOTTOM */}
                <div className="section">
                    <div className="section-title">Hotkeys:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            onClick={toggleHotkeys}
                            className={`hotkey-config-button ${hotkeyEnabled ? 'level-active' : ''}`}
                            style={hotkeyEnabled ? { backgroundColor: '#059669' } : {}}
                        >
                            {hotkeyEnabled ? 'Disable Hotkeys' : 'Enable Hotkeys'}
                        </button>
                        <button
                            onClick={() => setShowHotkeyManager(true)}
                            className="hotkey-config-button"
                        >
                            Configure Hotkeys
                        </button>
                    </div>
                    {hotkeyEnabled && (
                        <div className="selected-features" style={{ marginTop: '8px', fontSize: '11px' }}>
                            Press ESC to clear selections, ENTER to submit
                            <br/>
                            {Object.keys(hotkeys.tricks).length + Object.keys(hotkeys.levels).length +
                                Object.keys(hotkeys.features).length + Object.keys(hotkeys.execution).length +
                                Object.keys(hotkeys.deductions).length} hotkeys configured
                        </div>
                    )}
                </div>
            </div>

            {/* Hotkey Manager Modal */}
            <HotkeyManager
                isOpen={showHotkeyManager}
                onClose={() => setShowHotkeyManager(false)}
                hotkeys={hotkeys}
                onSave={saveHotkeys}
                showPoints={showPoints}
            />
        </div>
    );
};

export default ScoringTab;