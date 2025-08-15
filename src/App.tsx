import React, { useState, useEffect } from 'react';
import './App.css';
import { Feature, Score, SavedCompetitor, PerformanceScore, JudgeCategory } from './types';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';
import { formatScore } from './utils';
import Login from './Login';
import ScoringTab from './ScoringTab';
import PerformanceTab from './PerformanceTab';
import ScoreDetailsTab from './ScoreDetailsTab';
import ExportSubmitTab from './ExportSubmitTab';
import SavedCompetitorsTab from './SavedCompetitorsTab';
import RankingsTab from './RankingsTab';
import AdminTab from './AdminTab';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loggedInUsername, setLoggedInUsername] = useState('');
    const [scores, setScores] = useState<Score[]>([]);
    const [totalScore, setTotalScore] = useState(0);
    const [competitorName, setCompetitorName] = useState('');
    const [judgeName, setJudgeName] = useState('');
    const [judgeCategory, setJudgeCategory] = useState<JudgeCategory>('technical');
    const [multiplierLevel, setMultiplierLevel] = useState<number | null>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
    const [goeLevel, setGoeLevel] = useState(0);
    const [activeTab, setActiveTab] = useState<'technical' | 'performance' | 'details' | 'export' | 'saved' | 'rankings' | 'admin'>('technical');
    const [darkMode, setDarkMode] = useState(false);
    const [savedCompetitors, setSavedCompetitors] = useState<SavedCompetitor[]>([]);
    const [selectedCompetitorDetails, setSelectedCompetitorDetails] = useState<SavedCompetitor | null>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<SavedCompetitor | null>(null);
    const [showPoints, setShowPoints] = useState(false);
    const [isDisqualified, setIsDisqualified] = useState(false); // New DQ state

    // Performance scoring state
    const [performanceScores, setPerformanceScores] = useState<PerformanceScore>({
        control: 0,
        style: 0,
        spaceUsage: 0,
        choreography: 0,
        construction: 0,
        showmanship: 0
    });
    const [totalPerformanceScore, setTotalPerformanceScore] = useState(0);

    // Technical scoring state
    const [selectedTrick, setSelectedTrick] = useState<{name: string, difficulty: string, baseScore: number} | null>(null);
    const [selectedDeductions, setSelectedDeductions] = useState<{name: string, points: number, abbrev: string}[]>([]);

    // Calculate total performance score whenever performance scores change
    useEffect(() => {
        const total = Object.values(performanceScores).reduce((sum, score) => sum + score, 0);
        setTotalPerformanceScore(total);
    }, [performanceScores]);

    const handleLogin = (username: string) => {
        setIsAuthenticated(true);
        setLoggedInUsername(username);
        setJudgeName(username); // Auto-fill judge name with the logged-in username
    };

    const handleAdminAuth = (authenticated: boolean) => {
        setIsAdmin(authenticated);
    };

    const handleTabSwitch = (tab: 'technical' | 'performance' | 'details' | 'export' | 'saved' | 'rankings' | 'admin') => {
        if ((tab === 'details' || tab === 'export' || tab === 'rankings') && !isAdmin) {
            return; // Prevent switching to admin-only tabs
        }
        setActiveTab(tab);
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        const saved = localStorage.getItem('diabolo-saved-competitors');
        if (saved) {
            try {
                const parsedCompetitors = JSON.parse(saved);
                // Add judgeCategory field to existing competitors if missing, also add isDisqualified
                const updatedCompetitors = parsedCompetitors.map((comp: SavedCompetitor) => ({
                    ...comp,
                    judgeCategory: comp.judgeCategory || 'technical' as JudgeCategory,
                    isDisqualified: comp.isDisqualified || false
                }));
                setSavedCompetitors(updatedCompetitors);
                console.log('Loaded competitors from localStorage:', updatedCompetitors.length);
            } catch (error) {
                console.error('Error loading saved competitors:', error);
                localStorage.removeItem('diabolo-saved-competitors');
            }
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;

        localStorage.setItem('diabolo-saved-competitors', JSON.stringify(savedCompetitors));
        console.log('Saved competitors to localStorage:', savedCompetitors.length);
    }, [savedCompetitors, isAuthenticated]);

    const selectTrick = (trickName: string, difficulty: string, baseScore: number) => {
        const timeViolation = selectedDeductions.find(d => d.name === 'Time Violation');
        if (timeViolation) {
            setSelectedDeductions(selectedDeductions.filter(d => d.name !== 'Time Violation'));
        }

        if (selectedTrick?.name === trickName && selectedTrick?.difficulty === difficulty) {
            setSelectedTrick(null);
        } else {
            setSelectedTrick({ name: trickName, difficulty, baseScore });
        }
    };

    const toggleDeduction = (deduction: {name: string, points: number, abbrev: string}) => {
        const isSelected = selectedDeductions.find(d => d.name === deduction.name);

        if (isSelected) {
            setSelectedDeductions(selectedDeductions.filter(d => d.name !== deduction.name));
        } else {
            if (deduction.name === 'Time Violation') {
                if (selectedTrick) {
                    setSelectedTrick(null);
                    setSelectedFeatures([]);
                    setGoeLevel(0);
                    setMultiplierLevel(null);
                }
            }
            setSelectedDeductions([...selectedDeductions, deduction]);
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

        selectedDeductions.forEach(deduction => {
            preview += deduction.points;
        });

        return preview;
    };

    const submitScore = () => {
        if (!selectedTrick && selectedDeductions.length === 0) {
            alert('Please select a trick or deduction first');
            return;
        }

        if (selectedTrick) {
            let finalScore = selectedTrick.baseScore;
            let description = `${tricks.find(t => t.name === selectedTrick.name)?.abbrev}(${selectedTrick.difficulty})`;
            let identifier = tricks.find(t => t.name === selectedTrick.name)?.abbrev || '';

            // 1. Level multiplier (L)
            const multiplier = multiplierLevel ? multiplierLevels[multiplierLevel] : 1;
            if (multiplierLevel) {
                identifier += `L${multiplierLevel}`;
                finalScore *= multiplier;
                description += `×L${multiplierLevel}`;
            }

            // 2. Features
            selectedFeatures.forEach(feature => {
                identifier += feature.abbrev;
                if (feature.points) {
                    finalScore += feature.points;
                    description += `+${feature.abbrev}`;
                } else if (feature.multiplier) {
                    finalScore *= feature.multiplier;
                    description += `×${feature.abbrev}`;
                }
            });

            // 3. Execution (E)
            const goeMultiplier = goeLevels[goeLevel] ?? 1.0;
            finalScore *= goeMultiplier;
            if (goeLevel !== 0) {
                identifier += `E${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
                description += `×E${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
            }

            // 4. Deductions (last)
            if (selectedDeductions.length > 0) {
                selectedDeductions.forEach(deduction => {
                    finalScore += deduction.points;
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
            // Deduction-only scores
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
        setIsDisqualified(false); // Reset DQ status
    };

    const resetPerformanceScores = () => {
        setPerformanceScores({
            control: 0,
            style: 0,
            spaceUsage: 0,
            choreography: 0,
            construction: 0,
            showmanship: 0
        });
        setEditingCompetitor(null);
        setIsDisqualified(false); // Reset DQ status
    };

    const hasChanges = (original: SavedCompetitor) => {
        if (competitorName.trim() !== original.name) return true;
        if (judgeCategory !== original.judgeCategory) return true;
        if (isDisqualified !== (original.isDisqualified || false)) return true;

        if (judgeCategory === 'technical') {
            if (totalScore !== original.totalScore) return true;
            if (scores.length !== original.scores.length) return true;

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
        } else {
            if (totalPerformanceScore !== (original.totalPerformanceScore || 0)) return true;

            const originalPerf = original.performanceScores || {
                control: 0, style: 0, spaceUsage: 0,
                choreography: 0, construction: 0, showmanship: 0
            };

            for (const key in performanceScores) {
                if (performanceScores[key as keyof PerformanceScore] !== originalPerf[key as keyof PerformanceScore]) {
                    return true;
                }
            }
        }

        return false;
    };

    const cancelEdit = () => {
        if (editingCompetitor) {
            if (hasChanges(editingCompetitor)) {
                if (!window.confirm('You have unsaved changes. Are you sure you want to cancel editing?')) {
                    return;
                }
            }

            resetScores();
            resetPerformanceScores();
            setCompetitorName('');
            // Reset judge name back to logged-in username when canceling edit
            setJudgeName(loggedInUsername);
            setActiveTab('saved');
        }
    };

    const deleteCompetitor = (competitorId: string) => {
        if (window.confirm('Are you sure you want to delete this competitor?')) {
            setSavedCompetitors(prev => prev.filter(comp => comp.id !== competitorId));
            if (selectedCompetitorDetails?.id === competitorId) {
                setSelectedCompetitorDetails(null);
            }
            if (editingCompetitor?.id === competitorId) {
                resetScores();
                resetPerformanceScores();
                setCompetitorName('');
                // Reset judge name back to logged-in username when deleting edited competitor
                setJudgeName(loggedInUsername);
                setEditingCompetitor(null);
            }
        }
    };

    const loadCompetitorForEditing = (competitor: SavedCompetitor) => {
        setCompetitorName(competitor.name);
        setJudgeName(competitor.judgeName);
        setJudgeCategory(competitor.judgeCategory);
        setScores(competitor.scores);
        setTotalScore(competitor.totalScore);
        setIsDisqualified(competitor.isDisqualified || false);

        // Load performance scores
        setPerformanceScores(competitor.performanceScores || {
            control: 0,
            style: 0,
            spaceUsage: 0,
            choreography: 0,
            construction: 0,
            showmanship: 0
        });

        setEditingCompetitor(competitor);

        // Switch to appropriate tab based on judge category
        setActiveTab(competitor.judgeCategory === 'performance' ? 'performance' : 'technical');

        setSelectedTrick(null);
        setSelectedDeductions([]);
        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    const submitFinalScore = () => {
        if (!competitorName.trim()) {
            alert('Please enter a competitor name');
            return;
        }

        if (!judgeName.trim()) {
            alert('Please enter a judge name');
            return;
        }

        const hasTechnicalScores = scores.length > 0;
        const hasPerformanceScores = Object.values(performanceScores).some(score => score > 0);

        if (judgeCategory === 'technical' && !hasTechnicalScores && !isDisqualified) {
            alert('Please add technical scores or mark as disqualified before saving');
            return;
        }

        if (judgeCategory === 'performance' && !hasPerformanceScores && !isDisqualified) {
            alert('Please add performance scores or mark as disqualified before saving');
            return;
        }

        if (editingCompetitor) {
            setSavedCompetitors(prev => prev.filter(comp => comp.id !== editingCompetitor.id));
        }

        const newSavedCompetitor: SavedCompetitor = {
            id: editingCompetitor ? editingCompetitor.id : Date.now().toString(),
            name: competitorName.trim(),
            judgeName: judgeName.trim(),
            judgeCategory: judgeCategory,
            totalScore: judgeCategory === 'technical' ? (isDisqualified ? 0 : totalScore) : 0,
            scores: judgeCategory === 'technical' ? [...scores] : [],
            performanceScores: judgeCategory === 'performance' ? { ...performanceScores } : undefined,
            totalPerformanceScore: judgeCategory === 'performance' ? (isDisqualified ? 0 : totalPerformanceScore) : undefined,
            submittedAt: new Date().toISOString(),
            isDisqualified: isDisqualified
        };

        setSavedCompetitors(prev => [...prev, newSavedCompetitor]);

        resetScores();
        resetPerformanceScores();
        setCompetitorName('');

        // Keep the judge name as the logged-in username (don't reset it for non-admin)
        if (!isAdmin) {
            setJudgeName(loggedInUsername);
        }

        setActiveTab('saved');

        if (editingCompetitor) {
            alert('Competitor updated successfully!');
        } else {
            alert('Competitor saved successfully!');
        }
    };

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

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
                            onClick={() => handleTabSwitch('technical')}
                            className={`tab-button ${activeTab === 'technical' ? 'tab-active' : ''}`}
                        >
                            Technical
                        </button>
                        <button
                            onClick={() => handleTabSwitch('performance')}
                            className={`tab-button ${activeTab === 'performance' ? 'tab-active' : ''}`}
                        >
                            Performance
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
                            onClick={() => handleTabSwitch('rankings')}
                            className={`tab-button ${activeTab === 'rankings' ? 'tab-active' : ''} ${!isAdmin ? 'disabled' : ''}`}
                            title={!isAdmin ? 'Admin access required' : ''}
                        >
                            Rankings {!isAdmin && '🔒'}
                        </button>
                        <button
                            onClick={() => handleTabSwitch('admin')}
                            className={`tab-button ${activeTab === 'admin' ? 'tab-active' : ''}`}
                        >
                            Admin
                        </button>
                    </div>

                    {activeTab === 'technical' && (
                        <ScoringTab
                            competitorName={competitorName}
                            setCompetitorName={setCompetitorName}
                            judgeName={judgeName}
                            setJudgeName={setJudgeName}
                            judgeCategory={judgeCategory}
                            setJudgeCategory={setJudgeCategory}
                            totalScore={totalScore}
                            scores={scores}
                            editingCompetitor={editingCompetitor}
                            selectedTrick={selectedTrick}
                            selectedDeductions={selectedDeductions}
                            selectedFeatures={selectedFeatures}
                            goeLevel={goeLevel}
                            multiplierLevel={multiplierLevel}
                            showPoints={showPoints && isAdmin}
                            isAdmin={isAdmin}
                            isDisqualified={isDisqualified}
                            setIsDisqualified={setIsDisqualified}
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
                            submitFinalScore={submitFinalScore}
                        />
                    )}

                    {activeTab === 'performance' && (
                        <PerformanceTab
                            competitorName={competitorName}
                            setCompetitorName={setCompetitorName}
                            judgeName={judgeName}
                            setJudgeName={setJudgeName}
                            judgeCategory={judgeCategory}
                            setJudgeCategory={setJudgeCategory}
                            performanceScores={performanceScores}
                            setPerformanceScores={setPerformanceScores}
                            totalPerformanceScore={totalPerformanceScore}
                            editingCompetitor={editingCompetitor}
                            isDisqualified={isDisqualified}
                            setIsDisqualified={setIsDisqualified}
                            resetPerformanceScores={resetPerformanceScores}
                            cancelEdit={cancelEdit}
                            submitFinalScore={submitFinalScore}
                        />
                    )}

                    {activeTab === 'details' && isAdmin && (
                        <ScoreDetailsTab
                            competitorName={competitorName}
                            totalScore={totalScore}
                            scores={scores}
                            removeScore={removeScore}
                            savedCompetitors={savedCompetitors}
                        />
                    )}

                    {activeTab === 'export' && isAdmin && (
                        <ExportSubmitTab
                            competitorName={competitorName}
                            setCompetitorName={setCompetitorName}
                            judgeName={judgeName}
                            setJudgeName={setJudgeName}
                            judgeCategory={judgeCategory}
                            totalScore={totalScore}
                            scores={scores}
                            performanceScores={performanceScores}
                            totalPerformanceScore={totalPerformanceScore}
                            editingCompetitor={editingCompetitor}
                            isDisqualified={isDisqualified}
                            submitFinalScore={submitFinalScore}
                            savedCompetitors={savedCompetitors}
                        />
                    )}

                    {activeTab === 'saved' && (
                        <SavedCompetitorsTab
                            savedCompetitors={savedCompetitors}
                            selectedCompetitorDetails={selectedCompetitorDetails}
                            setSelectedCompetitorDetails={setSelectedCompetitorDetails}
                            loadCompetitorForEditing={loadCompetitorForEditing}
                            deleteCompetitor={deleteCompetitor}
                            isAdmin={isAdmin}
                        />
                    )}

                    {activeTab === 'rankings' && isAdmin && (
                        <RankingsTab
                            savedCompetitors={savedCompetitors}
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