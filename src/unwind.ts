type UnwindAction = () => void;

export class Unwinder {
    private actions: UnwindAction[] = [];

    public add(action: UnwindAction) {
        this.actions.unshift(action);
    }

    public reset(): void {
        this.actions = [];
    }

    public unwind(): void {
        this.actions.forEach((action) => action());
        this.actions = [];
    }
}

type AsyncUnwindAction = () => Promise<void>;

export class AsyncUnwinder {
    private actions: AsyncUnwindAction[] = [];

    public add(action: AsyncUnwindAction) {
        this.actions.unshift(action);
    }

    public reset(): void {
        this.actions = [];
    }

    public async unwind(): Promise<void> {
        const promises = this.actions.map(async (action) => await action());
        await Promise.all(promises);
        this.actions = [];
    }
}
