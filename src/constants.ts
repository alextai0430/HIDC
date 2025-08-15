import { Feature } from './types';

export const tricks = [
    { name: 'Shuffle', abbrev: '#', scores: { '1D': 0, '2D': 0.7, '3D': 6, '4D': 15, 'VD': 0 } },
    { name: 'Toss/High', abbrev: 'T', scores: { '1D': 0.1, '2D': 1, '3D': 6, '4D': 12, 'VD': 0.2 } },
    { name: 'Orbit', abbrev: 'O', scores: { '1D': 0.2, '2D': 1.2, '3D': 4, '4D': 8, 'VD': 0.5 } },
    { name: 'Feed the sun', abbrev: 'F', scores: { '1D': 0, '2D': 1.5, '3D': 5, '4D': 10, 'VD': 0 } },
    { name: 'Swing/Sun', abbrev: 'S', scores: { '1D': 0.1, '2D': 1, '3D': 6, '4D': 12, 'VD': 0.2 } },
    { name: 'Whip', abbrev: 'W', scores: { '1D': 0.2, '2D': 0, '3D': 0, '4D': 0, 'VD': 0.4 } },
    { name: 'Stick Release/Gen', abbrev: 'R', scores: { '1D': 0.4, '2D': 1.2, '3D': 6, '4D': 12, 'VD': 1 } }
];

export const features: Feature[] = [
    { name: 'Turn 360', abbrev: 'T1', multiplier: 1.7, type: 'turn' },
    { name: 'Turn 720', abbrev: 'T2', multiplier: 3.0, type: 'turn' },
    { name: 'Turn 1080', abbrev: 'T3', multiplier: 5.0, type: 'turn' },
    { name: 'Acro', abbrev: 'A', points: 0.2, type: 'acro' }
];

export const majorDeductions = [
    { name: 'Unintentional Drop', abbrev: 'Drop', points: -0.3, type: 'deduction' },
    { name: 'Tangle', abbrev: 'Tang', points: -0.5, type: 'deduction' },
    { name: 'Time Violation', abbrev: 'Time', points: -2, type: 'deduction' },
    { name: 'Other Rule Violations', abbrev: 'Other', points: -2, type: 'deduction' }
];

export const multiplierLevels: Record<number, number> = {
    1: 2, 2: 4, 3: 6, 4: 8, 5: 10
};

export const goeLevels: Record<number, number> = {
    [-3]: 0.7,
    [-2]: 0.8,
    [-1]: 0.9,
    [0]: 1.0,
    [1]: 1.05,
    [2]: 1.1,
    [3]: 1.15
};