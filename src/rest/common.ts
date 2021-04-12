import XFormData from 'form-data';
import http from 'http';
import https from 'https';
import { StringDecoder } from 'string_decoder';
import { createUrl } from '../utils/platform';
import axios from 'axios';
import logger from '../logger';

// ////////////////////////////////////////////////////////////////////////////

export type TokenGetter = () => string;

export interface ITransportError extends Error {
    readonly code: number;
}

export class TransportError implements ITransportError {
    public readonly code: number;

    public readonly message: string;

    public readonly name = 'TransportError';

    public constructor(res: http.IncomingMessage) {
        this.code = res.statusCode || 0;
        this.message = res.statusMessage || '';
    }
}

declare type resolver = (value?: any | PromiseLike<any>) => void;
declare type rejector = (reason?: any) => void;
declare type promiseExecutor = (
    resolve: (value?: object | PromiseLike<object>) => void,
    reject: (reason?: any) => void
) => void;

interface IRequestOptionsExt extends http.RequestOptions {
    rejectUnauthorized?: boolean;
}

const makeRequest = (
    u: string,
    options: http.RequestOptions,
    callback: (res: http.IncomingMessage) => void
): http.ClientRequest => {
    const url = createUrl(u);

    const o = { ...options };
    o.protocol = url.protocol;
    o.hostname = url.hostname;
    o.port = url.port;
    o.path = url.pathname + url.hash + url.search;

    if (o.protocol === 'https:') {
        return https.request(o, callback);
    }

    return http.request(o, callback);
};

const checkStatusCode = (code: number | undefined): boolean => {
    if (code === undefined) {
        return false;
    }

    return code >= 200 && code < 400;
};

interface IResponseHandler {
    handleError: (err: Error) => void;
    handlePayload: (payload: string) => void;
}

const handleHttpCommonResponse = (res: http.IncomingMessage, handler: IResponseHandler): void => {
    if (!checkStatusCode(res.statusCode)) {
        handler.handleError(new TransportError(res));
    }

    let body = '';
    const decoder: StringDecoder = new StringDecoder('utf8');
    res.on('data', (data: Buffer) => {
        body += decoder.write(data);
    });
    res.on('end', () => {
        handler.handlePayload(body);
    });
    res.on('error', (err: any) => handler.handleError(err as Error));
};

const handleHttpTextResponse = (res: http.IncomingMessage, resolve: resolver, reject: rejector): void =>
    handleHttpCommonResponse(res, {
        handleError: (err: Error) => reject(err),
        handlePayload: (payload: string) => resolve(payload),
    });

const handleHttpJSONResponse = (res: http.IncomingMessage, resolve: resolver, reject: rejector): void =>
    handleHttpCommonResponse(res, {
        handleError: (err: Error) => reject(err),
        handlePayload: (body: string) => {
            if (body === '') {
                resolve({});
            } else {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    reject(err);
                }
            }
        },
    });

export async function post(baseUrl: string, authToken: string | null, endpoint: string, data: object): Promise<any> {
    const payload: string = JSON.stringify(data);

    const headers: http.OutgoingHttpHeaders = {
        'Content-Length': Buffer.byteLength(payload),
        'Content-Type': 'application/json;charset=UTF-8',
    };

    if (authToken !== null) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    const options: IRequestOptionsExt = {
        headers,
        method: 'POST',
        rejectUnauthorized: false,
    };

    return new Promise((resolve, reject): void => {
        const callback = (res: http.IncomingMessage): void => handleHttpJSONResponse(res, resolve, reject);
        const req: http.ClientRequest = makeRequest(`${baseUrl}${endpoint}`, options, callback);
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

type ResponseHandler = (res: http.IncomingMessage, resolve: resolver, reject: rejector) => void;

export async function getCommon(
    baseUrl: string,
    authToken: string,
    endpoint: string,
    responseHandler: ResponseHandler
): Promise<any> {
    const headers: http.OutgoingHttpHeaders = {
        Authorization: `Bearer ${authToken}`,
    };

    const options = {
        headers,
        method: 'GET',
        rejectUnauthorized: false,
    };

    return new Promise((resolve, reject): void => {
        const callback = (res: http.IncomingMessage): void => responseHandler(res, resolve, reject);
        const req: http.ClientRequest = makeRequest(`${baseUrl}${endpoint}`, options, callback);
        req.on('error', reject);
        req.end();
    });
}

// JSON responses
export const get = async (baseUrl: string, authToken: string, endpoint: string): Promise<any> =>
    getCommon(baseUrl, authToken, endpoint, handleHttpJSONResponse);

// Text responses
export const getText = async (baseUrl: string, authToken: string, endpoint: string): Promise<any> =>
    getCommon(baseUrl, authToken, endpoint, handleHttpTextResponse);

export interface IPutEntry {
    name: string;
    value: string | any; // fs.ReadStream;
}

export interface IUploadProgressInfo {
    percentage: number;
}

export type UploadProgressCallback = (info: IUploadProgressInfo) => void;

export async function putForm(
    baseUrl: string,
    authToken: string | null,
    endpoint: string,
    entries: IPutEntry[],
    callback?: UploadProgressCallback
): Promise<any> {
    const form = new XFormData();
    entries.forEach(entry => form.append(entry.name, entry.value));

    const agent = new https.Agent({
        rejectUnauthorized: false,
    });
    const config = {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
        httpsAgent: agent,
        onUploadProgress: (progressEvent: any) => {
            const percentCompleted = Math.floor((progressEvent.loaded * 100) / progressEvent.total);

            const info = { percentage: percentCompleted };
            if (callback) {
                callback(info);
            }
        },
    };

    try {
        const response = await axios.put(`${baseUrl}${endpoint}`, form, config);
        return response;
    } catch (err) {
        console.error(err);
    }
}

export async function download(baseUrl: string, authToken: string | null, endpoint: string): Promise<any> {
    const config: any = {
        responseType: 'blob',
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    };
    try {
        const response = await axios.get(`${baseUrl}${endpoint}`, config);
        return response;
    } catch (err) {
        console.error(err);
    }
}
export async function del(baseUrl: string, authToken: string, endpoint: string): Promise<void> {
    const headers: http.OutgoingHttpHeaders = {
        Authorization: `Bearer ${authToken}`,
    };

    const options = {
        headers,
        method: 'DELETE',
        rejectUnauthorized: false,
    };

    return new Promise((resolve, reject): void => {
        const callback = (res: http.IncomingMessage): void => handleHttpJSONResponse(res, resolve, reject);
        const req: http.ClientRequest = makeRequest(`${baseUrl}${endpoint}`, options, callback);
        req.on('error', reject);
        req.end();
    });
}

export interface IWSMessage {
    event: string;
    data: any;
}
// Returns a promise which resolves to:
// - the value returned by condition, if succeeded
// - undefined, if timeout
// condition should return a truthy value to indicate that the event is accepted.
export function makeAwaiter<TResponse>(
    ws: SocketIOClient.Socket,
    eventName: string,
    condition: (data: any) => TResponse | false,
    timeoutMs: number
): Promise<TResponse | undefined> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.off('message', callback);
            resolve(undefined);
        }, timeoutMs);

        const callback = (msg: IWSMessage) => {
            if (msg.event !== eventName) {
                return;
            }
            const result = condition(msg.data);
            if (result) {
                clearTimeout(timer);
                ws.off('message', callback);
                resolve(result);
            }
        };

        ws.on('message', callback);
    });
}

declare interface IResponseBase {
    result: number;
    success: boolean;
}

function isResponse(object: any): object is IResponseBase {
    return 'result' in object || 'success' in object;
}

export const validateResponseCode = (res: any): void => {
    if (!res) {
        throw new Error(`Failed: ${JSON.stringify(res)}`);
    }

    if (!isResponse(res)) {
        throw new Error(`Failed: ${JSON.stringify(res)}`);
    }

    const r: IResponseBase = res as IResponseBase;

    if (r.result !== 0 && r.success !== true) {
        throw new Error(`Failed: ${JSON.stringify(res)}`);
    }
};

export interface IWSMessage {
    event: string;
    data: any;
}
