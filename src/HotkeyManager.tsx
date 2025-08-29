import React, { useState, useEffect } from 'react';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';

export interface HotkeyConfig {
    tricks: { [key: string]: { name: string; difficulty: string; baseScore: number } };
    levels: { [key: string]: number };
    features: { [key: string]: string };
    execution: { [key: string]: number };
    deductions: { [key: string]: { name: string; points: number; abbrev: string } };
}

interface HotkeyManagerProps {
    isOpen: boolean;
    onClose: () => void;
    hotkeys: HotkeyConfig;
    onSave: (hotkeys: HotkeyConfig) => void;
    showPoints: boolean;
}

const HotkeyManager: React.FC<HotkeyManagerProps> = ({
                                                         isOpen,
                                                         onClose,
                                                         hotkeys,
                                                         onSave,
                                                         showPoints
                                                     }) => {
    const [localHotkeys, setLocalHotkeys] = useState<HotkeyConfig>(hotkeys);
    const [activeSection, setActiveSection] = useState<'tricks' | 'levels' | 'features' | 'execution' | 'deductions'>('tricks');
    const [recordingKey, setRecordingKey] = useState<string | null>(null);

    useEffect(() => {
        setLocalHotkeys(hotkeys);
    }, [hotkeys]);

    const handleKeyRecord = (e: KeyboardEvent) => {
        if (!recordingKey) return;

        e.preventDefault();
        e.stopPropagation();

        // Don't allow modifier keys alone or escape key
        if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) {
            setRecordingKey(null);
            return;
        }

        const key = e.key.toLowerCase();

        // Remove any existing hotkey with this key
        const newHotkeys = { ...localHotkeys };
        Object.keys(newHotkeys).forEach(section => {
            Object.keys(newHotkeys[section as keyof HotkeyConfig]).forEach(existingKey => {
                if (existingKey === key) {
                    delete (newHotkeys[section as keyof HotkeyConfig] as any)[existingKey];
                }
            });
        });

        // Add the new hotkey
        const [section, identifier] = recordingKey.split('|');

        if (section === 'tricks') {
            const [trickName, difficulty] = identifier.split('-');
            const trick = tricks.find(t => t.name === trickName);
            if (trick) {
                newHotkeys.tricks[key] = {
                    name: trickName,
                    difficulty,
                    baseScore: trick.scores[difficulty as keyof typeof trick.scores]
                };
            }
        } else if (section === 'levels') {
            newHotkeys.levels[key] = parseFloat(identifier);
        } else if (section === 'features') {
            newHotkeys.features[key] = identifier;
        } else if (section === 'execution') {
            newHotkeys.execution[key] = parseInt(identifier);
        } else if (section === 'deductions') {
            const deduction = majorDeductions.find(d => d.name === identifier);
            if (deduction) {
                newHotkeys.deductions[key] = deduction;
            }
        }

        setLocalHotkeys(newHotkeys);
        setRecordingKey(null);
    };

    useEffect(() => {
        if (recordingKey) {
            document.addEventListener('keydown', handleKeyRecord);
            return () => document.removeEventListener('keydown', handleKeyRecord);
        }
    }, [recordingKey]);

    const removeHotkey = (section: keyof HotkeyConfig, key: string) => {
        const newHotkeys = { ...localHotkeys };
        delete (newHotkeys[section] as any)[key];
        setLocalHotkeys(newHotkeys);
    };

    const getAssignedKey = (section: string, identifier: string): string | null => {
        const sectionHotkeys = localHotkeys[section as keyof HotkeyConfig] as any;
        for (const [key, value] of Object.entries(sectionHotkeys)) {
            if (section === 'tricks') {
                const trick = value as { name: string; difficulty: string };
                if (`${trick.name}-${trick.difficulty}` === identifier) return key;
            } else if (section === 'levels' && value === parseFloat(identifier)) {
                return key;
            } else if (section === 'features' && value === identifier) {
                return key;
            } else if (section === 'execution' && value === parseInt(identifier)) {
                return key;
            } else if (section === 'deductions') {
                const deduction = value as { name: string };
                if (deduction.name === identifier) return key;
            }
        }
        return null;
    };

    const clearAllHotkeys = () => {
        if (window.confirm('Are you sure you want to clear all hotkeys?')) {
            setLocalHotkeys({
                tricks: {},
                levels: {},
                features: {},
                execution: {},
                deductions: {}
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="hotkey-overlay">
            <div className="hotkey-modal">
                <div className="hotkey-header">
                    <h2>Hotkey Configuration</h2>
                    <button onClick={onClose} className="hotkey-close">×</button>
                </div>

                <div className="hotkey-content">
                    <div className="hotkey-tabs">
                        {(['tricks', 'levels', 'features', 'execution', 'deductions'] as const).map(section => (
                            <button
                                key={section}
                                onClick={() => setActiveSection(section)}
                                className={`hotkey-tab ${activeSection === section ? 'active' : ''}`}
                            >
                                {section.charAt(0).toUpperCase() + section.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="hotkey-section">
                        {activeSection === 'tricks' && (
                            <div className="hotkey-items">
                                <h3>Tricks</h3>
                                {tricks.map(trick =>
                                    Object.entries(trick.scores).map(([difficulty, score]) => {
                                        if (score === 0) return null;
                                        const identifier = `${trick.name}-${difficulty}`;
                                        const assignedKey = getAssignedKey('tricks', identifier);
                                        const isRecording = recordingKey === `tricks|${identifier}`;

                                        return (
                                            <div key={identifier} className="hotkey-item">
                                                <div className="hotkey-info">
                                                    <span className="hotkey-name">{trick.abbrev} ({difficulty})</span>
                                                    {showPoints && <span className="hotkey-value">{score} pts</span>}
                                                </div>
                                                <div className="hotkey-controls">
                                                    {assignedKey ? (
                                                        <>
                                                            <span className="hotkey-key">{assignedKey.toUpperCase()}</span>
                                                            <button
                                                                onClick={() => removeHotkey('tricks', assignedKey)}
                                                                className="hotkey-remove"
                                                            >
                                                                Remove
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => setRecordingKey(`tricks|${identifier}`)}
                                                            className={`hotkey-assign ${isRecording ? 'recording' : ''}`}
                                                            disabled={!!recordingKey && !isRecording}
                                                        >
                                                            {isRecording ? 'Press any key...' : 'Assign Key'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeSection === 'levels' && (
                            <div className="hotkey-items">
                                <h3>Levels</h3>
                                {[0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                                    const assignedKey = getAssignedKey('levels', level.toString());
                                    const isRecording = recordingKey === `levels|${level}`;
                                    const levelDisplay = level === 0.5 ? '0.5' : level.toString();

                                    return (
                                        <div key={level} className="hotkey-item">
                                            <div className="hotkey-info">
                                                <span className="hotkey-name">Level {levelDisplay}</span>
                                                {showPoints && <span className="hotkey-value">×{multiplierLevels[level]}</span>}
                                            </div>
                                            <div className="hotkey-controls">
                                                {assignedKey ? (
                                                    <>
                                                        <span className="hotkey-key">{assignedKey.toUpperCase()}</span>
                                                        <button
                                                            onClick={() => removeHotkey('levels', assignedKey)}
                                                            className="hotkey-remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setRecordingKey(`levels|${level}`)}
                                                        className={`hotkey-assign ${isRecording ? 'recording' : ''}`}
                                                        disabled={!!recordingKey && !isRecording}
                                                    >
                                                        {isRecording ? 'Press any key...' : 'Assign Key'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeSection === 'features' && (
                            <div className="hotkey-items">
                                <h3>Features</h3>
                                {features.map(feature => {
                                    const assignedKey = getAssignedKey('features', feature.name);
                                    const isRecording = recordingKey === `features|${feature.name}`;

                                    return (
                                        <div key={feature.name} className="hotkey-item">
                                            <div className="hotkey-info">
                                                <span className="hotkey-name">{feature.name} ({feature.abbrev})</span>
                                                {showPoints && (
                                                    <span className="hotkey-value">
                                                        {feature.multiplier ? `×${feature.multiplier}` : `+${feature.points}`}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="hotkey-controls">
                                                {assignedKey ? (
                                                    <>
                                                        <span className="hotkey-key">{assignedKey.toUpperCase()}</span>
                                                        <button
                                                            onClick={() => removeHotkey('features', assignedKey)}
                                                            className="hotkey-remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setRecordingKey(`features|${feature.name}`)}
                                                        className={`hotkey-assign ${isRecording ? 'recording' : ''}`}
                                                        disabled={!!recordingKey && !isRecording}
                                                    >
                                                        {isRecording ? 'Press any key...' : 'Assign Key'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeSection === 'execution' && (
                            <div className="hotkey-items">
                                <h3>Execution</h3>
                                {[-3, -2, -1, 0, 1, 2, 3].map(level => {
                                    const assignedKey = getAssignedKey('execution', level.toString());
                                    const isRecording = recordingKey === `execution|${level}`;

                                    return (
                                        <div key={level} className="hotkey-item">
                                            <div className="hotkey-info">
                                                <span className="hotkey-name">E{level >= 0 ? '+' : ''}{level}</span>
                                                {showPoints && <span className="hotkey-value">×{goeLevels[level]}</span>}
                                            </div>
                                            <div className="hotkey-controls">
                                                {assignedKey ? (
                                                    <>
                                                        <span className="hotkey-key">{assignedKey.toUpperCase()}</span>
                                                        <button
                                                            onClick={() => removeHotkey('execution', assignedKey)}
                                                            className="hotkey-remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setRecordingKey(`execution|${level}`)}
                                                        className={`hotkey-assign ${isRecording ? 'recording' : ''}`}
                                                        disabled={!!recordingKey && !isRecording}
                                                    >
                                                        {isRecording ? 'Press any key...' : 'Assign Key'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeSection === 'deductions' && (
                            <div className="hotkey-items">
                                <h3>Major Deductions</h3>
                                {majorDeductions.map(deduction => {
                                    const assignedKey = getAssignedKey('deductions', deduction.name);
                                    const isRecording = recordingKey === `deductions|${deduction.name}`;

                                    return (
                                        <div key={deduction.name} className="hotkey-item">
                                            <div className="hotkey-info">
                                                <span className="hotkey-name">{deduction.name} ({deduction.abbrev})</span>
                                                {showPoints && <span className="hotkey-value">{deduction.points} pts</span>}
                                            </div>
                                            <div className="hotkey-controls">
                                                {assignedKey ? (
                                                    <>
                                                        <span className="hotkey-key">{assignedKey.toUpperCase()}</span>
                                                        <button
                                                            onClick={() => removeHotkey('deductions', assignedKey)}
                                                            className="hotkey-remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setRecordingKey(`deductions|${deduction.name}`)}
                                                        className={`hotkey-assign ${isRecording ? 'recording' : ''}`}
                                                        disabled={!!recordingKey && !isRecording}
                                                    >
                                                        {isRecording ? 'Press any key...' : 'Assign Key'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="hotkey-footer">
                    <button onClick={clearAllHotkeys} className="hotkey-clear">
                        Clear All Hotkeys
                    </button>
                    <div className="hotkey-actions">
                        <button onClick={onClose} className="hotkey-cancel">
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onSave(localHotkeys);
                                onClose();
                            }}
                            className="hotkey-save"
                        >
                            Save Hotkeys
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HotkeyManager;