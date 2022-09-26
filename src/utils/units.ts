export type NumberAndUnit = [string, string];

function trimFixed(value: number): string {
    if (Math.sign(value) === -1) {
        const v = value.toFixed(3).slice(0, 5);
        return v[v.length - 1] === '.' ? v.slice(0, 4) : v;
    }
    const v = value.toFixed(3).slice(0, 4);
    return v[v.length - 1] === '.' ? v.slice(0, 3) : v;
}

// Returns [value: number, unit: string]
export function getValueAndUnits(value: number): NumberAndUnit {
    if (Math.abs(value) >= 1e9) {
        return [trimFixed(value / 1e9), 'G'];
    }

    if (Math.abs(value) >= 1e6) {
        return [trimFixed(value / 1e6), 'M'];
    }

    if (Math.abs(value) >= 1e3) {
        return [trimFixed(value / 1e3), 'k'];
    }

    if (Math.abs(value) >= 1 || value === 0) {
        return [trimFixed(value), ''];
    }

    if (Math.abs(value) <= 1e-9) {
        return [trimFixed(value * 1e9), 'n'];
    }

    if (Math.abs(value) <= 1e-6) {
        return [trimFixed(value * 1e6), 'µ'];
    }

    if (Math.abs(value) <= 1e-3) {
        return [trimFixed(value * 1e3), 'm'];
    }

    return [trimFixed(value), ''];
}
