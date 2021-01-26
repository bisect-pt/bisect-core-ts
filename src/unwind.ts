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
