import React, { useState, useEffect } from 'react';
import './App.css';
import { Feature, Score, SavedCompetitor, PerformanceScore, JudgeCategory } from './types';
import { tricks, features, majorDeductions, multiplierLevels, goeLevels } from './constants';
import { formatScore } from './utils';
import Login from './Login';
import ScoringTab from './ScoringTab';
import PerformanceTab from './PerformanceTab';
import ScoreDetailsTab from './ScoreDetailsTab';
import SavedCompetitorsTab from './SavedCompetitorsTab';
import RankingsTab from './RankingsTab';
import AdminTab from './AdminTab';
import FinalRankingsTab from './FinalRankingsTab';

const App: React.FC = () => {
    // Authentication & Admin state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loggedInUsername, setLoggedInUsername] = useState('');

    // Competitor & Judge info
    const [competitorName, setCompetitorName] = useState('');
    const [judgeName, setJudgeName] = useState('');
    const [judgeCategory, setJudgeCategory] = useState<JudgeCategory>('technical');
    const [isDisqualified, setIsDisqualified] = useState(false);

    // Technical scoring state
    const [scores, setScores] = useState<Score[]>([]);
    const [totalScore, setTotalScore] = useState(0);
    const [selectedTrick, setSelectedTrick] = useState<{name: string, difficulty: string, baseScore: number} | null>(null);
    const [selectedDeductions, setSelectedDeductions] = useState<{name: string, points: number, abbrev: string}[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
    const [goeLevel, setGoeLevel] = useState(0);
    const [multiplierLevel, setMultiplierLevel] = useState<number | null>(null);

    // Performance scoring state
    const [performanceScores, setPerformanceScores] = useState<PerformanceScore>({
        control: 0, style: 0, spaceUsage: 0, choreography: 0, construction: 0, showmanship: 0
    });
    const [totalPerformanceScore, setTotalPerformanceScore] = useState(0);

    // UI state
    const [activeTab, setActiveTab] = useState<'technical' | 'performance' | 'details' | 'saved' | 'rankings' | 'final-rankings' | 'admin'>('technical');
    const [darkMode, setDarkMode] = useState(false);
    const [showPoints, setShowPoints] = useState(false);

    // Data management state
    const [savedCompetitors, setSavedCompetitors] = useState<SavedCompetitor[]>([]);
    const [selectedCompetitorDetails, setSelectedCompetitorDetails] = useState<SavedCompetitor | null>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<SavedCompetitor | null>(null);

    // Calculate total performance score
    useEffect(() => {
        setTotalPerformanceScore(Object.values(performanceScores).reduce((sum, score) => sum + score, 0));
    }, [performanceScores]);

    // Authentication handlers
    const handleLogin = (username: string) => {
        setIsAuthenticated(true);
        setLoggedInUsername(username);
        setJudgeName(username);
    };

    const handleAdminAuth = (authenticated: boolean) => setIsAdmin(authenticated);

    const handleTabSwitch = (tab: 'technical' | 'performance' | 'details' | 'saved' | 'rankings' | 'final-rankings' | 'admin') => {
        if ((tab === 'details' || tab === 'rankings' || tab === 'final-rankings') && !isAdmin) return;
        setActiveTab(tab);
    };

    // LocalStorage management
    useEffect(() => {
        if (!isAuthenticated) return;
        const saved = localStorage.getItem('diabolo-saved-competitors');
        if (saved) {
            try {
                const parsedCompetitors = JSON.parse(saved);
                const updatedCompetitors = parsedCompetitors.map((comp: SavedCompetitor) => ({
                    ...comp,
                    judgeCategory: comp.judgeCategory || 'technical' as JudgeCategory,
                    isDisqualified: comp.isDisqualified || false
                }));
                setSavedCompetitors(updatedCompetitors);
            } catch (error) {
                console.error('Error loading saved competitors:', error);
                localStorage.removeItem('diabolo-saved-competitors');
            }
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            localStorage.setItem('diabolo-saved-competitors', JSON.stringify(savedCompetitors));
        }
    }, [savedCompetitors, isAuthenticated]);

    // Technical scoring functions
    const selectTrick = (trickName: string, difficulty: string, baseScore: number) => {
        if (selectedDeductions.find(d => d.name === 'Time Violation')) {
            setSelectedDeductions(selectedDeductions.filter(d => d.name !== 'Time Violation'));
        }
        setSelectedTrick(selectedTrick?.name === trickName && selectedTrick?.difficulty === difficulty ? null : { name: trickName, difficulty, baseScore });
    };

    const toggleDeduction = (deduction: {name: string, points: number, abbrev: string}) => {
        const isSelected = selectedDeductions.find(d => d.name === deduction.name);
        if (isSelected) {
            setSelectedDeductions(selectedDeductions.filter(d => d.name !== deduction.name));
        } else {
            if (deduction.name === 'Time Violation' && selectedTrick) {
                setSelectedTrick(null);
                setSelectedFeatures([]);
                setGoeLevel(0);
                setMultiplierLevel(null);
            }
            setSelectedDeductions([...selectedDeductions, deduction]);
        }
    };

    const toggleFeature = (feature: Feature) => {
        if (feature.type === 'turn') {
            const otherTurns = selectedFeatures.filter(f => f.type !== 'turn');
            const isCurrentlySelected = selectedFeatures.find(f => f.name === feature.name);
            setSelectedFeatures(isCurrentlySelected ? otherTurns : [...otherTurns, feature]);
        } else {
            const isSelected = selectedFeatures.find(f => f.name === feature.name);
            setSelectedFeatures(isSelected ? selectedFeatures.filter(f => f.name !== feature.name) : [...selectedFeatures, feature]);
        }
    };

    const toggleMultiplier = (level: number) => {
        setMultiplierLevel(multiplierLevel === level ? null : level);
    };

    const getPreviewScore = () => {
        if (!selectedTrick && selectedDeductions.length > 0) {
            return selectedDeductions.reduce((sum, deduction) => sum + deduction.points, 0);
        }
        if (!selectedTrick) return 0;

        let preview = selectedTrick.baseScore;
        selectedFeatures.forEach(feature => {
            if (feature.points) preview += feature.points;
            else if (feature.multiplier) preview *= feature.multiplier;
        });
        preview *= goeLevels[goeLevel] ?? 1.0;
        if (multiplierLevel) preview *= multiplierLevels[multiplierLevel];
        selectedDeductions.forEach(deduction => preview += deduction.points);
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

            // Add difficulty prefix
            identifier = selectedTrick.difficulty.replace('D', '') + identifier;

            // Apply multipliers and features in order
            const multiplier = multiplierLevel ? multiplierLevels[multiplierLevel] : 1;
            if (multiplierLevel) {
                identifier += `L${multiplierLevel}`;
                finalScore *= multiplier;
                description += `×L${multiplierLevel}`;
            }

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

            finalScore *= goeLevels[goeLevel] ?? 1.0;
            if (goeLevel !== 0) {
                identifier += `E${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
                description += `×E${goeLevel >= 0 ? '+' : ''}${goeLevel}`;
            }

            selectedDeductions.forEach(deduction => {
                finalScore += deduction.points;
                identifier += deduction.abbrev;
                description += `+${deduction.abbrev}`;
            });

            const newScore: Score = {
                id: Date.now(), trick: selectedTrick.name, difficulty: selectedTrick.difficulty,
                baseScore: selectedTrick.baseScore, features: [...selectedFeatures], goeLevel,
                multiplierLevel, finalScore, description, identifier, deductions: [...selectedDeductions]
            };

            setScores([...scores, newScore]);
            setTotalScore(totalScore + finalScore);
        } else {
            // Deduction-only scores
            let finalScore = 0, description = '', identifier = '';
            selectedDeductions.forEach((deduction, index) => {
                finalScore += deduction.points;
                if (index > 0) { identifier += '+'; description += '+'; }
                identifier += deduction.abbrev;
                description += `${deduction.abbrev} (${deduction.points})`;
            });

            const newScore: Score = {
                id: Date.now(), trick: selectedDeductions.length === 1 ? selectedDeductions[0].name : 'Multiple Deductions',
                difficulty: 'DEDUCTION', baseScore: finalScore, features: [], goeLevel: 0,
                multiplierLevel: null, finalScore, description, identifier, deductions: [...selectedDeductions]
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
        setIsDisqualified(false);
    };

    const resetPerformanceScores = () => {
        setPerformanceScores({ control: 0, style: 0, spaceUsage: 0, choreography: 0, construction: 0, showmanship: 0 });
        setEditingCompetitor(null);
        setIsDisqualified(false);
    };

    // Competitor management
    const hasChanges = (original: SavedCompetitor) => {
        if (competitorName.trim() !== original.name || judgeCategory !== original.judgeCategory ||
            isDisqualified !== original.isDisqualified) return true;

        if (judgeCategory === 'technical') {
            if (totalScore !== original.totalScore || scores.length !== original.scores.length) return true;
            return scores.some((score, i) => {
                const orig = original.scores[i];
                return !orig || score.trick !== orig.trick || score.difficulty !== orig.difficulty ||
                    score.finalScore !== orig.finalScore || score.identifier !== orig.identifier;
            });
        } else {
            if (totalPerformanceScore !== (original.totalPerformanceScore || 0)) return true;
            const originalPerf = original.performanceScores || { control: 0, style: 0, spaceUsage: 0, choreography: 0, construction: 0, showmanship: 0 };
            return Object.keys(performanceScores).some(key => performanceScores[key as keyof PerformanceScore] !== originalPerf[key as keyof PerformanceScore]);
        }
    };

    const cancelEdit = () => {
        if (editingCompetitor && hasChanges(editingCompetitor) &&
            !window.confirm('You have unsaved changes. Are you sure you want to cancel editing?')) return;

        resetScores();
        resetPerformanceScores();
        setCompetitorName('');
        setJudgeName(loggedInUsername);
        setActiveTab('saved');
    };

    const deleteCompetitor = (competitorId: string) => {
        if (!window.confirm('Are you sure you want to delete this competitor?')) return;

        setSavedCompetitors(prev => prev.filter(comp => comp.id !== competitorId));
        if (selectedCompetitorDetails?.id === competitorId) setSelectedCompetitorDetails(null);
        if (editingCompetitor?.id === competitorId) {
            resetScores();
            resetPerformanceScores();
            setCompetitorName('');
            setJudgeName(loggedInUsername);
            setEditingCompetitor(null);
        }
    };

    const loadCompetitorForEditing = (competitor: SavedCompetitor) => {
        setCompetitorName(competitor.name);
        setJudgeName(competitor.judgeName);
        setJudgeCategory(competitor.judgeCategory);
        setScores(competitor.scores);
        setTotalScore(competitor.totalScore);
        setIsDisqualified(competitor.isDisqualified || false);
        setPerformanceScores(competitor.performanceScores || { control: 0, style: 0, spaceUsage: 0, choreography: 0, construction: 0, showmanship: 0 });
        setEditingCompetitor(competitor);
        setActiveTab(competitor.judgeCategory === 'performance' ? 'performance' : 'technical');

        // Reset selections
        setSelectedTrick(null);
        setSelectedDeductions([]);
        setMultiplierLevel(null);
        setSelectedFeatures([]);
        setGoeLevel(0);
    };

    const submitFinalScore = () => {
        if (!competitorName.trim()) return alert('Please enter a competitor name');
        if (!judgeName.trim()) return alert('Please enter a judge name');

        const actualJudgeCategory = activeTab === 'performance' ? 'performance' : 'technical';
        if (actualJudgeCategory === 'technical' && scores.length === 0 && !isDisqualified) {
            return alert('Please add technical scores or mark as disqualified before saving');
        }

        if (editingCompetitor) {
            setSavedCompetitors(prev => prev.filter(comp => comp.id !== editingCompetitor.id));
        }

        const newSavedCompetitor: SavedCompetitor = {
            id: editingCompetitor ? editingCompetitor.id : Date.now().toString(),
            name: competitorName.trim(),
            judgeName: judgeName.trim(),
            judgeCategory: actualJudgeCategory,
            totalScore: actualJudgeCategory === 'technical' ? (isDisqualified ? 0 : totalScore) : 0,
            scores: actualJudgeCategory === 'technical' ? [...scores] : [],
            performanceScores: actualJudgeCategory === 'performance' ? { ...performanceScores } : undefined,
            totalPerformanceScore: actualJudgeCategory === 'performance' ? (isDisqualified ? 0 : totalPerformanceScore) : undefined,
            submittedAt: new Date().toISOString(),
            isDisqualified
        };

        setSavedCompetitors(prev => [...prev, newSavedCompetitor]);
        resetScores();
        resetPerformanceScores();
        setCompetitorName('');
        if (!isAdmin) setJudgeName(loggedInUsername);
        setActiveTab('saved');
        alert(editingCompetitor ? 'Competitor updated successfully!' : 'Competitor saved successfully!');
    };

    if (!isAuthenticated) return <Login onLogin={handleLogin} />;

    const tabComponents = {
        technical: <ScoringTab {...{competitorName, setCompetitorName, judgeName, setJudgeName, judgeCategory, setJudgeCategory, totalScore, scores, editingCompetitor, selectedTrick, selectedDeductions, selectedFeatures, goeLevel, multiplierLevel, showPoints: showPoints && isAdmin, isAdmin, isDisqualified, setIsDisqualified, selectTrick, selectDeduction: toggleDeduction, setGoeLevel, toggleMultiplier, toggleFeature, getPreviewScore, submitScore, removeScore, resetScores, cancelEdit, submitFinalScore}} />,
        performance: <PerformanceTab {...{competitorName, setCompetitorName, judgeName, setJudgeName, judgeCategory, setJudgeCategory, performanceScores, setPerformanceScores, totalPerformanceScore, editingCompetitor, isDisqualified, setIsDisqualified, resetPerformanceScores, cancelEdit, submitFinalScore}} />,
        details: isAdmin && <ScoreDetailsTab {...{competitorName, totalScore, scores, removeScore, savedCompetitors}} />,
        saved: <SavedCompetitorsTab {...{savedCompetitors, selectedCompetitorDetails, setSelectedCompetitorDetails, loadCompetitorForEditing, deleteCompetitor, isAdmin}} />,
        rankings: isAdmin && <RankingsTab savedCompetitors={savedCompetitors} />,
        'final-rankings': isAdmin && <FinalRankingsTab savedCompetitors={savedCompetitors} />,
        admin: <AdminTab {...{showPoints, setShowPoints, isAdmin, onAdminAuth: handleAdminAuth}} />
    };

    return (
        <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="app-content">
                <div className="app-card">
                    <h1 className="app-title clickable" onClick={() => setDarkMode(!darkMode)} title="Click to toggle dark mode">
                        Diabolo Scoring {editingCompetitor && <span className="editing-indicator">(Editing: {editingCompetitor.name})</span>}
                    </h1>

                    <div className="tab-nav">
                        {(['technical', 'performance', 'details', 'saved', 'rankings', 'final-rankings', 'admin'] as const).map(tab => (
                            <button key={tab} onClick={() => handleTabSwitch(tab)}
                                    className={`tab-button ${activeTab === tab ? 'tab-active' : ''} ${!isAdmin && (tab === 'details' || tab === 'rankings' || tab === 'final-rankings') ? 'disabled' : ''}`}
                                    title={!isAdmin && (tab === 'details' || tab === 'rankings' || tab === 'final-rankings') ? 'Admin access required' : ''}>
                                {tab === 'technical' ? 'Technical' :
                                    tab === 'performance' ? 'Performance' :
                                        tab === 'details' ? `Score Details ${!isAdmin ? '🔒' : ''}` :
                                            tab === 'saved' ? `Saved Competitors (${savedCompetitors.length})` :
                                                tab === 'rankings' ? `Rankings ${!isAdmin ? '🔒' : ''}` :
                                                    tab === 'final-rankings' ? `Final Rankings ${!isAdmin ? '🔒' : ''}` : 'Admin'}
                            </button>
                        ))}
                    </div>

                    {tabComponents[activeTab]}
                </div>
            </div>
        </div>
    );
};

export default App;