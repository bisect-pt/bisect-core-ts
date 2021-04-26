import {
    get,
    getText,
    IPutEntry,
    post,
    putForm,
    del,
    TokenGetter,
    UploadProgressCallback,
    makeAwaiter,
    download,
    patch,
    put,
} from './common';

export class RestClient {
    public constructor(private readonly baseUrl: string, private readonly tokenGetter: TokenGetter) {}

    public async get(endpoint: string) {
        return get(this.baseUrl, this.tokenGetter(), endpoint);
    }

    public async getText(endpoint: string) {
        return getText(this.baseUrl, this.tokenGetter(), endpoint);
    }

    public async post(endpoint: string, data: object) {
        return post(this.baseUrl, this.tokenGetter(), endpoint, data);
    }

    public async postBase(endpoint: string, data: object) {
        return post(this.baseUrl, this.tokenGetter(), endpoint, data);
    }

    public async putForm(endpoint: string, entries: IPutEntry[], callback?: UploadProgressCallback): Promise<any> {
        return await putForm(this.baseUrl, this.tokenGetter(), endpoint, entries, callback);
    }

    public async del(endpoint: string) {
        return del(this.baseUrl, this.tokenGetter(), endpoint);
    }
    public async download(endpoint: string) {
        return download(this.baseUrl, this.tokenGetter(), endpoint);
    }

    public async patch(endpoint: string, value: any) {
        return patch(this.baseUrl, this.tokenGetter(), endpoint, value);
    }

    public async put(endpoint: string, value: any) {
        return put(this.baseUrl, this.tokenGetter(), endpoint, value);
    }

    public makeAwaiter<TResponse>(
        ws: SocketIOClient.Socket,
        eventName: string,
        condition: (data: any) => TResponse | undefined,
        timeoutMs: number
    ): Promise<TResponse | undefined> {
        return makeAwaiter(ws, eventName, condition, timeoutMs);
    }

    public getAuthUrl(path: string) {
        const token = this.tokenGetter();

        if (path.includes('?')) {
            return `${path}&token=Bearer ${token}`;
        }

        return `${path}?token=Bearer ${token}`;
    }
}
