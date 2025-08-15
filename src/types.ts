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

export interface SavedCompetitor {
    id: string;
    name: string;
    judgeName: string;
    totalScore: number;
    scores: Score[];
    submittedAt: string;
}