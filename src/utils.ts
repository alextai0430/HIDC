// Helper function to format numbers to 3 decimal places, removing trailing zeros
export const formatScore = (score: number): string => {
    return parseFloat(score.toFixed(3)).toString();
};

export const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case '1D': return 'difficulty-1d';
        case '2D': return 'difficulty-2d';
        case '3D': return 'difficulty-3d';
        case '4D': return 'difficulty-4d';
        case 'VD': return 'difficulty-vd';
        case 'DEDUCTION': return 'difficulty-deduction';
        default: return 'difficulty-default';
    }
};

export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Calculate adjusted technical score based on highest technical score
export const calculateAdjustedScore = (competitorScore: number, highestScore: number): number => {
    if (highestScore === 0) return 0;
    return (competitorScore / highestScore) * 70;
};

// Get highest technical score from all competitors
export const getHighestTechnicalScore = (competitors: any[]): number => {
    const technicalCompetitors = competitors.filter(comp => comp.judgeCategory === 'technical');
    if (technicalCompetitors.length === 0) return 0;
    return Math.max(...technicalCompetitors.map(comp => comp.totalScore));
};

// Export helpers
export const csvEscape = (val: any) => {
    const s = String(val ?? '');
    if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

export const downloadFile = (filename: string, content: string, mime: string) => {
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