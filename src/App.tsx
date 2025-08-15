import React, { useState, useEffect } from 'react';
import './App.css';
import { Feature, Score, SavedCompetitor } from './types';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';
import { formatScore } from './utils';
import Login from './Login';
import ScoringTab from './ScoringTab';
import ScoreDetailsTab from './ScoreDetailsTab';
import ExportSubmitTab from './ExportSubmitTab';
import SavedCompetitorsTab from './SavedCompetitorsTab';
import AdminTab from './AdminTab';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); // New admin state
    const [scores, setScores] = useState<Score[]>([]);
    const [totalScore, setTotalScore] = useState(0);
    const [competitorName, setCompetitorName] = useState('');
    const [judgeName, setJudgeName] = useState('');
    const [multiplierLevel, setMultiplierLevel] = useState<number | null>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
    const [goeLevel, setGoeLevel] = useState(0);
    const [activeTab, setActiveTab] = useState<'scoring' | 'details' | 'export' | 'saved' | 'admin'>('scoring');
    const [darkMode, setDarkMode] = useState(false);
    const [savedCompetitors, setSavedCompetitors] = useState<SavedCompetitor[]>([]);
    const [selectedCompetitorDetails, setSelectedCompetitorDetails] = useState<SavedCompetitor | null>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<SavedCompetitor | null>(null);
    const [showPoints, setShowPoints] = useState(false);

    // New state for selected trick and deductions
    const [selectedTrick, setSelectedTrick] = useState<{name: string, difficulty: string, baseScore: number} | null>(null);
    const [selectedDeductions, setSelectedDeductions] = useState<{name: string, points: number, abbrev: string}[]>([]);

    // Handle login
    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    // Handle admin authentication from AdminTab
    const handleAdminAuth = (authenticated: boolean) => {
        setIsAdmin(authenticated);
    };

    // Load saved competitors from localStorage on mount
    useEffect(() => {
        if (!isAuthenticated) return;

        const saved = localStorage.getItem('diabolo-saved-competitors');
        if (saved) {
            try {
                const parsedCompetitors = JSON.parse(saved);
                setSavedCompetitors(parsedCompetitors);
                console.log('Loaded competitors from localStorage:', parsedCompetitors.length);
            } catch (error) {
                console.error('Error loading saved competitors:', error);
                localStorage.removeItem('diabolo-saved-competitors');
            }
        }
    }, [isAuthenticated]);

    // Save competitors to localStorage whenever savedCompetitors changes
    useEffect(() => {
        if (!isAuthenticated) return;

        localStorage.setItem('diabolo-saved-competitors', JSON.stringify(savedCompetitors));
        console.log('Saved competitors to localStorage:', savedCompetitors.length);
    }, [savedCompetitors, isAuthenticated]);

    // Show login form if not authenticated
    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    const submitScore = () => {
        if (!selectedTrick && selectedDeductions.length === 0) {
            alert('Please select a trick or deduction first');
            return;
        }

        if (selectedTrick) {
            // Handle regular trick scoring with optional deductions
            let finalScore = selectedTrick.baseScore;
            let description = `${tricks.find(t => t.name === selectedTrick.name)?.abbrev}(${selectedTrick.difficulty})`;
            let identifier = tricks.find(t => t.name === selectedTrick.name)?.abbrev || '';

            selectedFeatures.forEach(feature => {
                identifier += feature.abbrev;
                if (feature.points) {
                    finalScore += feature.points;
                    description += `+${feature.abbrev}`;
                } else if (feature.multiplier) {
                    finalScore *= feature.multiplier;
                    description += `Ã—${feature.abbrev}`;
                }
            });

            const goeMultiplier = goeLevels[goeLevel] ?? 1.0;
            finalScore *= goeMultiplier;
            if (goeLevel !== 0) {
                identifier += `G${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
                description += `Ã—G${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
            }

            const multiplier = multiplierLevel ? multiplierLevels[multiplierLevel] : 1;
            if (multiplierLevel) {
                identifier += `M${multiplierLevel}`;
                finalScore *= multiplier;
                description += `Ã—${multiplier}`;
            }

            // Add deductions to the trick
            if (selectedDeductions.length > 0) {
                selectedDeductions.forEach(deduction => {
                    finalScore += deduction.points; // deductions are negative
                    identifier += deduction.abbrev;
                    description += `+${deduction.abbrev}`;
                });
            }

            const newScore: Score = {
                id: Date.now(),
                trick: selectedTrick.name,
                difficulty: selectedTrick.difficulty,
                baseScore: selectedTrick.baseScore,
                features: [...selectedFeatures],
                goeLevel,
                multiplierLevel,
                finalScore,
                description,
                identifier,
                deductions: [...selectedDeductions]
            };

            setScores([...scores, newScore]);
            setTotalScore(totalScore + finalScore);

        } else if (selectedDeductions.length > 0) {
            // Handle deduction-only scoring (when no trick is selected)
            let finalScore = 0;
            let description = '';
            let identifier = '';

            selectedDeductions.forEach((deduction, index) => {
                finalScore += deduction.points;
                if (index > 0) {
                    identifier += '+';
                    description += '+';
                }
                identifier += deduction.abbrev;
                description += `${deduction.abbrev} (${deduction.points})`;
            });

            const newScore: Score = {
                id: Date.now(),
                trick: selectedDeductions.length === 1 ? selectedDeductions[0].name : 'Multiple Deductions',
                difficulty: 'DEDUCTION',
                baseScore: finalScore,
                features: [],
                goeLevel: 0,
                multiplierLevel: null,
                finalScore,
                description,
                identifier,
                deductions: [...selectedDeductions]
            };

            setScores([...scores, newScore]);
            setTotalScore(totalScore + finalScore);
        }

        // Reset selections
        setSelectedTrick(null);
        setSelectedDeductions([]);
        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    const selectTrick = (trickName: string, difficulty: string, baseScore: number) => {
        // Check if Time Violation is selected - if so, clear it first
        const timeViolation = selectedDeductions.find(d => d.name === 'Time Violation');
        if (timeViolation) {
            setSelectedDeductions(selectedDeductions.filter(d => d.name !== 'Time Violation'));
        }

        // If clicking the same trick and difficulty, deselect it
        if (selectedTrick?.name === trickName && selectedTrick?.difficulty === difficulty) {
            setSelectedTrick(null);
        } else {
            setSelectedTrick({ name: trickName, difficulty, baseScore });
        }
    };

    const toggleDeduction = (deduction: {name: string, points: number, abbrev: string}) => {
        const isSelected = selectedDeductions.find(d => d.name === deduction.name);

        if (isSelected) {
            // Remove deduction
            setSelectedDeductions(selectedDeductions.filter(d => d.name !== deduction.name));
        } else {
            // Special handling for Time Violation - it cannot be combined with tricks
            if (deduction.name === 'Time Violation') {
                if (selectedTrick) {
                    // Clear the selected trick if Time Violation is selected
                    setSelectedTrick(null);
                    // Also clear features, GOE, and multipliers since there's no trick
                    setSelectedFeatures([]);
                    setGoeLevel(0);
                    setMultiplierLevel(null);
                }
            }

            // Add deduction
            setSelectedDeductions([...selectedDeductions, deduction]);
        }
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
        setSelectedTrick(null);
        setSelectedDeductions([]);
        setEditingCompetitor(null);
    };

    // Helper function to check if current data has changed from the original
    const hasChanges = (original: SavedCompetitor) => {
        if (competitorName.trim() !== original.name) return true;
        if (totalScore !== original.totalScore) return true;
        if (scores.length !== original.scores.length) return true;

        // Check if any scores are different
        for (let i = 0; i < scores.length; i++) {
            const currentScore = scores[i];
            const originalScore = original.scores[i];

            if (!originalScore) return true;

            if (currentScore.trick !== originalScore.trick ||
                currentScore.difficulty !== originalScore.difficulty ||
                currentScore.finalScore !== originalScore.finalScore ||
                currentScore.identifier !== originalScore.identifier) {
                return true;
            }
        }

        return false;
    };

    const loadCompetitorForEditing = (competitor: SavedCompetitor) => {
        // Load their data into the current scoring session WITHOUT removing from saved list
        setCompetitorName(competitor.name);
        setScores(competitor.scores);
        setTotalScore(competitor.totalScore);
        setEditingCompetitor(competitor);

        // Switch to scoring tab
        setActiveTab('scoring');

        // Clear selections
        setSelectedTrick(null);
        setSelectedDeductions([]);
        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    // Modified submitFinalScore to work for both admin and non-admin
    const submitFinalScore = () => {
        if (!competitorName.trim()) {
            alert('Please enter a competitor name');
            return;
        }

        if (scores.length === 0) {
            alert('Please add some scores before saving');
            return;
        }

        // For non-admin users, we don't require judge name
        const finalJudgeName = judgeName.trim() || 'Unknown Judge';

        if (editingCompetitor) {
            // Remove the old version only when saving changes
            setSavedCompetitors(prev => prev.filter(comp => comp.id !== editingCompetitor.id));
        }

        const newSavedCompetitor: SavedCompetitor = {
            id: editingCompetitor ? editingCompetitor.id : Date.now().toString(),
            name: competitorName.trim(),
            judgeName: finalJudgeName,
            totalScore: totalScore,
            scores: [...scores],
            submittedAt: new Date().toISOString()
        };

        setSavedCompetitors(prev => [...prev, newSavedCompetitor]);

        // Reset everything
        resetScores();
        setCompetitorName('');

        // Only reset judge name for non-admin users if it was empty
        if (!isAdmin || !judgeName.trim()) {
            setJudgeName('');
        }

        // Switch to saved competitors tab
        setActiveTab('saved');

        if (editingCompetitor) {
            alert('Competitor updated successfully!');
        } else {
            alert('Competitor saved successfully!');
        }
    };

    const cancelEdit = () => {
        if (editingCompetitor) {
            if (hasChanges(editingCompetitor)) {
                if (!window.confirm('You have unsaved changes. Are you sure you want to cancel editing?')) {
                    return;
                }
            }

            // Reset everything without removing the competitor from saved list
            // (since we never removed it in the first place)
            resetScores();
            setCompetitorName('');
            if (!isAdmin) setJudgeName(''); // Only reset judge name for non-admin
            setActiveTab('saved');
        }
    };

    const deleteCompetitor = (competitorId: string) => {
        if (window.confirm('Are you sure you want to delete this competitor?')) {
            setSavedCompetitors(prev => prev.filter(comp => comp.id !== competitorId));
            if (selectedCompetitorDetails?.id === competitorId) {
                setSelectedCompetitorDetails(null);
            }
            // If we're currently editing this competitor, clear the editing state
            if (editingCompetitor?.id === competitorId) {
                resetScores();
                setCompetitorName('');
                if (!isAdmin) setJudgeName('');
            }
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

    const getPreviewScore = () => {
        if (!selectedTrick && selectedDeductions.length > 0) {
            // Deduction-only score
            return selectedDeductions.reduce((sum, deduction) => sum + deduction.points, 0);
        }

        if (!selectedTrick) return 0;

        let preview = selectedTrick.baseScore;

        selectedFeatures.forEach(feature => {
            if (feature.points) {
                preview += feature.points;
            } else if (feature.multiplier) {
                preview *= feature.multiplier;
            }
        });

        const goeMultiplier = goeLevels[goeLevel] ?? 1.0;
        preview *= goeMultiplier;

        const multiplier = multiplierLevel ? multiplierLevels[multiplierLevel] : 1;
        if (multiplierLevel) {
            preview *= multiplier;
        }

        // Add deductions
        selectedDeductions.forEach(deduction => {
            preview += deduction.points;
        });

        return preview;
    };

    // Handle tab switching with admin check for details and export only
    const handleTabSwitch = (tab: 'scoring' | 'details' | 'export' | 'saved' | 'admin') => {
        if ((tab === 'details' || tab === 'export') && !isAdmin) {
            alert('Admin access required to view score details and export functionality');
            return;
        }
        setActiveTab(tab);
    };

    return (
        <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="app-content">
                <div className="app-card">
                    <h1
                        className="app-title clickable"
                        onClick={() => setDarkMode(!darkMode)}
                        title="Click to toggle dark mode"
                    >
                        Diabolo Scoring {editingCompetitor && <span className="editing-indicator">(Editing: {editingCompetitor.name})</span>}
                    </h1>

                    {/* Tab Navigation */}
                    <div className="tab-nav">
                        <button
                            onClick={() => handleTabSwitch('scoring')}
                            className={`tab-button ${activeTab === 'scoring' ? 'tab-active' : ''}`}
                        >
                            Scoring
                        </button>
                        <button
                            onClick={() => handleTabSwitch('details')}
                            className={`tab-button ${activeTab === 'details' ? 'tab-active' : ''} ${!isAdmin ? 'disabled' : ''}`}
                            title={!isAdmin ? 'Admin access required' : ''}
                        >
                            Score Details {!isAdmin && '🔒'}
                        </button>
                        <button
                            onClick={() => handleTabSwitch('export')}
                            className={`tab-button ${activeTab === 'export' ? 'tab-active' : ''} ${!isAdmin ? 'disabled' : ''}`}
                            title={!isAdmin ? 'Admin access required' : ''}
                        >
                            Export / Submit {!isAdmin && '🔒'}
                        </button>
                        <button
                            onClick={() => handleTabSwitch('saved')}
                            className={`tab-button ${activeTab === 'saved' ? 'tab-active' : ''}`}
                        >
                            Saved Competitors ({savedCompetitors.length})
                        </button>
                        <button
                            onClick={() => handleTabSwitch('admin')}
                            className={`tab-button ${activeTab === 'admin' ? 'tab-active' : ''}`}
                        >
                            Admin
                        </button>
                    </div>

                    {activeTab === 'scoring' && (
                        <ScoringTab
                            competitorName={competitorName}
                            setCompetitorName={setCompetitorName}
                            judgeName={judgeName}
                            setJudgeName={setJudgeName}
                            totalScore={totalScore}
                            scores={scores}
                            editingCompetitor={editingCompetitor}
                            selectedTrick={selectedTrick}
                            selectedDeductions={selectedDeductions}
                            selectedFeatures={selectedFeatures}
                            goeLevel={goeLevel}
                            multiplierLevel={multiplierLevel}
                            showPoints={showPoints && isAdmin} // Only show points if admin
                            isAdmin={isAdmin} // Pass admin status
                            selectTrick={selectTrick}
                            selectDeduction={toggleDeduction}
                            setGoeLevel={setGoeLevel}
                            toggleMultiplier={toggleMultiplier}
                            toggleFeature={toggleFeature}
                            getPreviewScore={getPreviewScore}
                            submitScore={submitScore}
                            removeScore={removeScore}
                            resetScores={resetScores}
                            cancelEdit={cancelEdit}
                            submitFinalScore={submitFinalScore} // Add this for non-admin save
                        />
                    )}

                    {activeTab === 'details' && isAdmin && (
                        <ScoreDetailsTab
                            competitorName={competitorName}
                            totalScore={totalScore}
                            scores={scores}
                            removeScore={removeScore}
                        />
                    )}

                    {activeTab === 'export' && isAdmin && (
                        <ExportSubmitTab
                            competitorName={competitorName}
                            setCompetitorName={setCompetitorName}
                            judgeName={judgeName}
                            setJudgeName={setJudgeName}
                            totalScore={totalScore}
                            scores={scores}
                            editingCompetitor={editingCompetitor}
                            submitFinalScore={submitFinalScore}
                        />
                    )}

                    {activeTab === 'saved' && (
                        <SavedCompetitorsTab
                            savedCompetitors={savedCompetitors}
                            selectedCompetitorDetails={selectedCompetitorDetails}
                            setSelectedCompetitorDetails={setSelectedCompetitorDetails}
                            loadCompetitorForEditing={loadCompetitorForEditing}
                            deleteCompetitor={deleteCompetitor}
                            isAdmin={isAdmin} // Pass admin status
                        />
                    )}

                    {activeTab === 'admin' && (
                        <AdminTab
                            showPoints={showPoints}
                            setShowPoints={setShowPoints}
                            isAdmin={isAdmin}
                            onAdminAuth={handleAdminAuth}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;