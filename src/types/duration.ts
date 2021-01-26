export interface IDuration {
    ms: number;
}

export class Duration implements IDuration {
    public static ms(value: number): Duration {
        return new Duration(value);
    }

    public static s(value: number): Duration {
        return new Duration(value * 1000);
    }

    private constructor(private readonly milliseconds: number) {}

    public get ms(): number {
        return this.milliseconds;
    }

    public get s(): number {
        return this.milliseconds / 1000;
    }
}
