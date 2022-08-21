import { Unwinder } from './unwind';

it('unwinds', async () => {
    const unwinder = new Unwinder();

    let calls: number[] = [];

    try {
        unwinder.add(() => calls.push(0));
        unwinder.add(() => calls.push(1));
        throw new Error();
        unwinder.add(() => calls.push(2));
    } catch (e) {
    } finally {
        unwinder.unwind();
    }

    expect(calls).toStrictEqual([1, 0]);
});
