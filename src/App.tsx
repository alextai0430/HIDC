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

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [scores, setScores] = useState<Score[]>([]);
    const [totalScore, setTotalScore] = useState(0);
    const [competitorName, setCompetitorName] = useState('');
    const [multiplierLevel, setMultiplierLevel] = useState<number | null>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
    const [goeLevel, setGoeLevel] = useState(0);
    const [activeTab, setActiveTab] = useState<'scoring' | 'details' | 'export' | 'saved'>('scoring');
    const [darkMode, setDarkMode] = useState(false);
    const [savedCompetitors, setSavedCompetitors] = useState<SavedCompetitor[]>([]);
    const [selectedCompetitorDetails, setSelectedCompetitorDetails] = useState<SavedCompetitor | null>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<SavedCompetitor | null>(null);

    // New state for selected trick and deductions
    const [selectedTrick, setSelectedTrick] = useState<{name: string, difficulty: string, baseScore: number} | null>(null);
    const [selectedDeduction, setSelectedDeduction] = useState<{name: string, points: number, abbrev: string} | null>(null);

    // Handle login
    const handleLogin = () => {
        setIsAuthenticated(true);
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
        if (!selectedTrick && !selectedDeduction) {
            alert('Please select a trick or deduction first');
            return;
        }

        if (selectedTrick) {
            // Handle regular trick scoring
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
                trick: selectedTrick.name,
                difficulty: selectedTrick.difficulty,
                baseScore: selectedTrick.baseScore,
                features: [...selectedFeatures],
                goeLevel,
                multiplierLevel,
                finalScore,
                description,
                identifier
            };

            setScores([...scores, newScore]);
            setTotalScore(totalScore + finalScore);

        } else if (selectedDeduction) {
            // Handle deduction scoring
            const newScore: Score = {
                id: Date.now(),
                trick: selectedDeduction.name,
                difficulty: 'DEDUCTION',
                baseScore: selectedDeduction.points,
                features: [],
                goeLevel: 0,
                multiplierLevel: null,
                finalScore: selectedDeduction.points,
                description: `${selectedDeduction.abbrev} (${selectedDeduction.points})`,
                identifier: selectedDeduction.abbrev
            };

            setScores([...scores, newScore]);
            setTotalScore(totalScore + selectedDeduction.points);
        }

        // Reset selections
        setSelectedTrick(null);
        setSelectedDeduction(null);
        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    const selectTrick = (trickName: string, difficulty: string, baseScore: number) => {
        // Clear deduction selection
        setSelectedDeduction(null);

        // If clicking the same trick and difficulty, deselect it
        if (selectedTrick?.name === trickName && selectedTrick?.difficulty === difficulty) {
            setSelectedTrick(null);
        } else {
            setSelectedTrick({ name: trickName, difficulty, baseScore });
        }
    };

    const selectDeduction = (deduction: {name: string, points: number, abbrev: string}) => {
        // Clear trick selection and related features
        setSelectedTrick(null);
        setSelectedFeatures([]);
        setMultiplierLevel(null);
        setGoeLevel(0);

        // Toggle deduction selection
        if (selectedDeduction?.name === deduction.name) {
            setSelectedDeduction(null);
        } else {
            setSelectedDeduction(deduction);
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
        setSelectedDeduction(null);
        setEditingCompetitor(null);
    };

    const loadCompetitorForEditing = (competitor: SavedCompetitor) => {
        // Remove the competitor from saved list temporarily
        setSavedCompetitors(prev => prev.filter(comp => comp.id !== competitor.id));

        // Load their data into the current scoring session
        setCompetitorName(competitor.name);
        setScores(competitor.scores);
        setTotalScore(competitor.totalScore);
        setEditingCompetitor(competitor);

        // Switch to scoring tab
        setActiveTab('scoring');

        // Clear selections
        setSelectedTrick(null);
        setSelectedDeduction(null);
        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    const submitFinalScore = () => {
        if (!competitorName.trim()) {
            alert('Please enter a competitor name');
            return;
        }

        if (scores.length === 0) {
            alert('Please add some scores before submitting');
            return;
        }

        const newSavedCompetitor: SavedCompetitor = {
            id: editingCompetitor ? editingCompetitor.id : Date.now().toString(),
            name: competitorName.trim(),
            totalScore: totalScore,
            scores: [...scores],
            submittedAt: new Date().toISOString()
        };

        setSavedCompetitors(prev => [...prev, newSavedCompetitor]);

        // Reset everything
        resetScores();
        setCompetitorName('');

        // Switch to saved competitors tab
        setActiveTab('saved');

        if (editingCompetitor) {
            alert('Competitor score updated successfully!');
        } else {
            alert('Competitor score submitted successfully!');
        }
    };

    const cancelEdit = () => {
        if (editingCompetitor && window.confirm('Are you sure you want to cancel editing? The original score will be restored.')) {
            // Restore the original competitor
            setSavedCompetitors(prev => [...prev, editingCompetitor]);
            resetScores();
            setCompetitorName('');
            setActiveTab('saved');
        }
    };

    const deleteCompetitor = (competitorId: string) => {
        if (window.confirm('Are you sure you want to delete this competitor?')) {
            setSavedCompetitors(prev => prev.filter(comp => comp.id !== competitorId));
            if (selectedCompetitorDetails?.id === competitorId) {
                setSelectedCompetitorDetails(null);
            }
        }
    };

    const toggleFeature = (feature: Feature) => {
        // Can't use features with deductions
        if (selectedDeduction) return;

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
        // Can't use multipliers with deductions
        if (selectedDeduction) return;

        if (multiplierLevel === level) {
            setMultiplierLevel(null);
        } else {
            setMultiplierLevel(level);
        }
    };

    const getPreviewScore = () => {
        if (selectedDeduction) {
            return selectedDeduction.points;
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

        return preview;
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
                        <button
                            onClick={() => setActiveTab('export')}
                            className={`tab-button ${activeTab === 'export' ? 'tab-active' : ''}`}
                        >
                            Export / Submit
                        </button>
                        <button
                            onClick={() => setActiveTab('saved')}
                            className={`tab-button ${activeTab === 'saved' ? 'tab-active' : ''}`}
                        >
                            Saved Competitors ({savedCompetitors.length})
                        </button>
                    </div>

                    {activeTab === 'scoring' && (
                        <ScoringTab
                            competitorName={competitorName}
                            setCompetitorName={setCompetitorName}
                            totalScore={totalScore}
                            scores={scores}
                            editingCompetitor={editingCompetitor}
                            selectedTrick={selectedTrick}
                            selectedDeduction={selectedDeduction}
                            selectedFeatures={selectedFeatures}
                            goeLevel={goeLevel}
                            multiplierLevel={multiplierLevel}
                            selectTrick={selectTrick}
                            selectDeduction={selectDeduction}
                            setGoeLevel={setGoeLevel}
                            toggleMultiplier={toggleMultiplier}
                            toggleFeature={toggleFeature}
                            getPreviewScore={getPreviewScore}
                            submitScore={submitScore}
                            removeScore={removeScore}
                            resetScores={resetScores}
                            cancelEdit={cancelEdit}
                        />
                    )}

                    {activeTab === 'details' && (
                        <ScoreDetailsTab
                            competitorName={competitorName}
                            totalScore={totalScore}
                            scores={scores}
                            removeScore={removeScore}
                        />
                    )}

                    {activeTab === 'export' && (
                        <ExportSubmitTab
                            competitorName={competitorName}
                            setCompetitorName={setCompetitorName}
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
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;