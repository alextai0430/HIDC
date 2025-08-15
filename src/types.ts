export interface Feature {
    name: string;
    abbrev: string;
    multiplier?: number;
    points?: number;
    type: string;
}

export interface Deduction {
    name: string;
    abbrev: string;
    points: number;
}

export interface Score {
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
    deductions?: Deduction[];
}

export interface PerformanceScore {
    control: number;
    style: number;
    spaceUsage: number;
    choreography: number;
    construction: number;
    showmanship: number;
}

export interface PerformanceCategory {
    name: string;
    key: keyof PerformanceScore;
    description: string;
}

export type JudgeCategory = 'technical' | 'performance';

export interface SavedCompetitor {
    id: string;
    name: string;
    judgeName: string;
    judgeCategory: JudgeCategory;
    totalScore: number;
    scores: Score[];
    performanceScores?: PerformanceScore;
    totalPerformanceScore?: number;
    submittedAt: string;
    isDisqualified?: boolean; // New field for DQ status
}

export interface ScoreDetailsTabProps {
    competitorName: string;
    totalScore: number;
    scores: Score[];
    removeScore: (scoreId: number) => void;
}