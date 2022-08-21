export type NumberAndUnit = [string, string];

function trimFixed(value: number): string {
    const v = value.toFixed(3).slice(0, 4);
    return v[v.length - 1] === '.' ? v.slice(0, 3) : v;
}

// Returns [value: number, unit: string]
export function getValueAndUnits(value: number): NumberAndUnit {
    if (value > 1e9) {
        return [trimFixed(value / 1e9), 'G'];
    }

    if (value > 1e6) {
        return [trimFixed(value / 1e6), 'M'];
    }

    if (value >= 1e3) {
        return [trimFixed(value / 1e3), 'k'];
    }

    if (value >= 1) {
        return [trimFixed(value), ''];
    }

    if (value >= 1e-3) {
        return [trimFixed(value * 1e3), 'm'];
    }

    if (value >= 1e-6) {
        return [trimFixed(value * 1e6), 'µ'];
    }

    return [trimFixed(value * 1e9), 'n'];
}
