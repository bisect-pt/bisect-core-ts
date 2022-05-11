import FormData from 'form-data';
import http from 'http';
import https from 'https';
import { StringDecoder } from 'string_decoder';
import { createUrl, isBrowser } from '../utils/platform';
import axios from 'axios';
import logger from '../logger';
import * as stream from 'stream';

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

const handleHttpCommonResponse = (
    res: http.IncomingMessage,
    handler: IResponseHandler,
    unauthorizedResponse?: (code: number | undefined) => boolean
): void => {
    if (!checkStatusCode(res.statusCode)) {
        handler.handleError(new TransportError(res));
    }
    if (unauthorizedResponse) {
        unauthorizedResponse(res.statusCode);
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

const handleHttpTextResponse = (
    res: http.IncomingMessage,
    resolve: resolver,
    reject: rejector,
    unauthorizedResponse?: (code: number | undefined) => boolean
): void =>
    handleHttpCommonResponse(
        res,
        {
            handleError: (err: Error) => reject(err),
            handlePayload: (payload: string) => resolve(payload),
        },
        unauthorizedResponse
    );

const handleHttpJSONResponse = (
    res: http.IncomingMessage,
    resolve: resolver,
    reject: rejector,
    unauthorizedResponse?: (code: number | undefined) => boolean
): void =>
    handleHttpCommonResponse(
        res,
        {
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
        },
        unauthorizedResponse
    );

export async function post(
    baseUrl: string,
    authToken: string | null,
    endpoint: string,
    data: object,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> {
    const payload: string = JSON.stringify(data);

    const headers: http.OutgoingHttpHeaders = {
        'Content-Length': Buffer.byteLength(payload),
        'Content-Type': 'application/json',
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
        const callback = (res: http.IncomingMessage): void =>
            handleHttpJSONResponse(res, resolve, reject, unauthorizedResponse);
        const req: http.ClientRequest = makeRequest(`${baseUrl}${endpoint}`, options, callback);
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

type ResponseHandler = (
    res: http.IncomingMessage,
    resolve: resolver,
    reject: rejector,
    unauthorizedResponse?: (code: number | undefined) => boolean
) => void;

export async function getCommon(
    baseUrl: string,
    authToken: string,
    endpoint: string,
    responseHandler: ResponseHandler,
    unauthorizedResponse?: (code: number | undefined) => boolean
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
        const callback = (res: http.IncomingMessage): void =>
            responseHandler(res, resolve, reject, unauthorizedResponse);

        const req: http.ClientRequest = makeRequest(`${baseUrl}${endpoint}`, options, callback);
        req.on('error', reject);
        req.end();
    });
}

// JSON responses
export const get = async (
    baseUrl: string,
    authToken: string,
    endpoint: string,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> => getCommon(baseUrl, authToken, endpoint, handleHttpJSONResponse, unauthorizedResponse);

// Text responses
export const getText = async (
    baseUrl: string,
    authToken: string,
    endpoint: string,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> => getCommon(baseUrl, authToken, endpoint, handleHttpTextResponse, unauthorizedResponse);

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
    callback?: UploadProgressCallback,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> {
    const form = new FormData();
    entries.forEach((entry) => form.append(entry.name, entry.value));

    const agent = new https.Agent({
        rejectUnauthorized: false,
    });

    const config = {
        headers: isBrowser()
            ? { Authorization: `Bearer ${authToken}` }
            : { ...form.getHeaders(), Authorization: `Bearer ${authToken}` },
        httpsAgent: agent,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent: any) => {
            const percentCompleted = Math.floor((progressEvent.loaded * 100) / progressEvent.total);
            const info = { percentage: percentCompleted };
            if (callback) {
                callback(info);
            }
        },
        validateStatus: unauthorizedResponse,
    };

    try {
        const response = await axios.put(`${baseUrl}${endpoint}`, form, config);
        return response.data;
    } catch (err) {
        console.error(err);
    }
}

export async function patch(
    baseUrl: string,
    authToken: string | null,
    endpoint: string,
    value: any,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> {
    const agent = new https.Agent({
        rejectUnauthorized: false,
    });

    const config = {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
        httpsAgent: agent,
        validateStatus: unauthorizedResponse,
    };

    try {
        const response = await axios.patch(`${baseUrl}${endpoint}`, value, config);
        return response;
    } catch (err) {
        console.error(err);
    }
}

export async function put(
    baseUrl: string,
    authToken: string | null,
    endpoint: string,
    value: any,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> {
    const agent = new https.Agent({
        rejectUnauthorized: false,
    });

    const config = {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
        httpsAgent: agent,
        validateStatus: unauthorizedResponse,
    };

    try {
        const response = await axios.put(`${baseUrl}${endpoint}`, value, config);
        //For put in settings of list
        if (response.status === 200) {
            return response;
        }
        return validateResponseCode(response.data);
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export async function download(
    baseUrl: string,
    authToken: string | null,
    endpoint: string,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> {
    const agent = new https.Agent({
        rejectUnauthorized: false,
    });

    const config: any = {
        responseType: 'blob',
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
        httpsAgent: agent,
        validateStatus: unauthorizedResponse,
    };
    try {
        const response = await axios.get(`${baseUrl}${endpoint}`, config);
        return response;
    } catch (err) {
        console.error(err);
    }
}

export async function downloadFile(
    baseUrl: string,
    authToken: string | null,
    endpoint: string,
    outputStream: any,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<any> {
    const agent = new https.Agent({
        rejectUnauthorized: false,
    });
    const config: any = {
        responseType: 'stream',
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
        httpsAgent: agent,
        validateStatus: unauthorizedResponse,
    };
    try {
        const response = await axios.get(`${baseUrl}${endpoint}`, config);
        response.data.pipe(outputStream);
        return new Promise((resolve: any, reject: any) => {
            stream.finished(outputStream, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}

export async function del(
    baseUrl: string,
    authToken: string,
    endpoint: string,
    unauthorizedResponse?: (code: number | undefined) => boolean
): Promise<void> {
    const headers: http.OutgoingHttpHeaders = {
        Authorization: `Bearer ${authToken}`,
    };

    const options = {
        headers,
        method: 'DELETE',
        rejectUnauthorized: false,
    };

    return new Promise((resolve, reject): void => {
        const callback = (res: http.IncomingMessage): void =>
            handleHttpJSONResponse(res, resolve, reject, unauthorizedResponse);
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
// condition should return anything other than undefined to indicate that the event is accepted.
export function makeAwaiter<TResponse>(
    ws: SocketIOClient.Socket,
    eventName: string,
    condition: (data: any) => TResponse | undefined,
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
            const result: TResponse | undefined = condition(msg.data);
            if (result === undefined) {
                return;
            }

            clearTimeout(timer);
            ws.off('message', callback);
            resolve(result);
        };

        ws.on('message', callback);
    });
}

declare interface IResponseBase {
    result: number;
    success: boolean;
    content: unknown;
}

function isResponse(object: any): object is IResponseBase {
    return 'result' in object || 'success' in object;
}

export const validateResponseCode = (res: unknown): unknown => {
    if (!res) {
        throw new Error(`Failed: ${JSON.stringify(res)}`);
    }

    if (!isResponse(res)) {
        throw new Error(`Failed: ${JSON.stringify(res)}`);
    }

    const r: IResponseBase = res;

    if (r.result !== 0 && r.success !== true) {
        throw new Error(`Failed: ${JSON.stringify(res)}`);
    }
    return res.content;
};
