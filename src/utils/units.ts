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
    const v = Math.abs(value);
    if (v >= 1e9) {
        return [trimFixed(value / 1e9), 'G'];
    }

    if (v >= 1e6) {
        return [trimFixed(value / 1e6), 'M'];
    }

    if (v >= 1e3) {
        return [trimFixed(value / 1e3), 'k'];
    }

    if (v >= 1 || value === 0) {
        return [trimFixed(value), ''];
    }

    if (v >= 1e-3) {
        return [trimFixed(value * 1e3), 'm'];
    }

    if (v >= 1e-6) {
        return [trimFixed(value * 1e6), 'µ'];
    }

    if (v >= 1e-9) {
        return [trimFixed(value * 1e9), 'n'];
    }

    return [trimFixed(value), ''];
}
