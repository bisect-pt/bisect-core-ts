import { getValueAndUnits, NumberAndUnit } from './units';

type TestData = {
    multiplier: number;
    unit: string;
};

const samples: TestData[] = [
    {
        multiplier: 1e9,
        unit: 'G',
    },
    {
        multiplier: 1e6,
        unit: 'M',
    },
    {
        multiplier: 1e3,
        unit: 'k',
    },
    {
        multiplier: 1,
        unit: '',
    },
    {
        multiplier: 1e-3,
        unit: 'm',
    },
    {
        multiplier: 1e-6,
        unit: 'µ',
    },
    {
        multiplier: 1e-9,
        unit: 'n',
    },
];

samples.forEach(({ multiplier, unit }: TestData) => {
    it(`handles ${unit} correctly`, () => {
        expect(getValueAndUnits(123.234232 * multiplier)).toStrictEqual(['123', unit]);
        expect(getValueAndUnits(12.3234232 * multiplier)).toStrictEqual(['12.3', unit]);
        expect(getValueAndUnits(1.23234232 * multiplier)).toStrictEqual(['1.23', unit]);
    });
});
