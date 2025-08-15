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

// Updated utils.ts - Add these helper functions for better text alignment
// Add these functions to your existing utils.ts file

// Existing exports should remain unchanged

// Helper function to ensure consistent column width padding
export const padColumn = (text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string => {
    const str = String(text || '');
    if (str.length >= width) {
        return str.substring(0, width);
    }

    const padding = width - str.length;
    switch (align) {
        case 'right':
            return ' '.repeat(padding) + str;
        case 'center':
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
        default: // 'left'
            return str + ' '.repeat(padding);
    }
};

// Helper function to create consistent separator lines
export const createSeparatorLine = (totalWidth: number, char: string = '-'): string => {
    return char.repeat(totalWidth);
};