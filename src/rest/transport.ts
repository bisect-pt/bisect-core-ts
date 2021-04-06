import { IPutEntry, UploadProgressCallback } from './common';
import { RestClient } from './restClient';

export class Transport {
    public constructor(public readonly rest: RestClient, private readonly wsGetter: () => SocketIOClient.Socket ) {}
    

    public async get(endpoint: string) {
        return this.rest.get(endpoint);
    }

    public async getText(endpoint: string) {
        return this.rest.getText(endpoint);
    }

    public async post(endpoint: string, data: object) {
        return this.rest.post(endpoint, data);
    }

    public async putForm(endpoint: string, entries: IPutEntry[], callback?: UploadProgressCallback): Promise<any> {
        return this.rest.putForm(endpoint, entries, callback);
    }

    public async del(endpoint: string) {
        return this.rest.del(endpoint);
    }

    // Returns a promise which resolves to:
    // - the event, if succeeded
    // - undefined, if timeout
    public makeAwaiter<TResponse>(eventName: string,
        condition: (data: any) => TResponse | false,
        timeoutMs: number): Promise<TResponse | undefined> {
        return this.rest.makeAwaiter(this.wsGetter(), eventName, condition, timeoutMs);
    }
}
