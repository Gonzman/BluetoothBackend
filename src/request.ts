const PORT = Number(process.env.PORT || 3000);

export interface AppRequest {
    method: string;
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    text: () => Promise<string>;
    json: <T = unknown>() => Promise<T>;
}

export interface AppResponse {
    _headers: Record<string, string>;
    _status: number | undefined;
    status: (code: number) => AppResponse;
    set: (name: string, value: string) => AppResponse;
    send: (body: unknown) => Response;
    json: (obj: unknown) => Response;
}

type Handler = (req: AppRequest, res: AppResponse) => unknown | Promise<unknown>;

export default function createApp() {
    const routes = new Map<string, Handler>();

    function get(path: string, handler: Handler): void {
        routes.set(`GET ${path}`, handler);
    }

    function post(path: string, handler: Handler): void {
        routes.set(`POST ${path}`, handler);
    }

    function set(name: string, value: string): void {
        // Global default headers
        globalHeaders[name] = value;
    }

    const globalHeaders: Record<string, string> = {};

    function listen(port = PORT, cb?: () => void): void {
        if (typeof Bun === "undefined" || typeof Bun.serve !== "function") {
            throw new Error("Bun runtime with Bun.serve is required for this server.");
        }

        Bun.serve({
            port,
            async fetch(req: Request): Promise<Response> {
                const url = new URL(req.url);
                const key = `${req.method} ${url.pathname}`;
                const handler = routes.get(key);
                if (!handler) return new Response("Not found", { status: 404 });

                let sentResponse: Response | null = null;

                const reqObj: AppRequest = {
                    method: req.method,
                    path: url.pathname,
                    query: Object.fromEntries(url.searchParams),
                    headers: Object.fromEntries(req.headers),
                    text: async () => await req.text(),
                    json: async <T = unknown>() => JSON.parse(await req.text()) as T,
                };

                const resObj: AppResponse = {
                    _headers: { ...globalHeaders },
                    _status: undefined,

                    status(code: number): AppResponse {
                        this._status = code;
                        return this;
                    },

                    set(name: string, value: string): AppResponse {
                        this._headers[name] = value;
                        return this;
                    },

                    send(body: unknown): Response {
                        const status = this._status ?? 200;

                        if (body === null || body === undefined) {
                            sentResponse = new Response(null, {
                                status,
                                headers: this._headers,
                            });
                        } else if (typeof body === "object") {
                            sentResponse = new Response(JSON.stringify(body), {
                                status,
                                headers: {
                                    "Content-Type": "application/json",
                                    ...this._headers,
                                },
                            });
                        } else {
                            sentResponse = new Response(String(body), {
                                status,
                                headers: {
                                    "Content-Type": "text/plain; charset=utf-8",
                                    ...this._headers,
                                },
                            });
                        }
                        return sentResponse;
                    },

                    json(obj: unknown): Response {
                        return this.send(obj);
                    },
                };

                try {
                    const maybe = await handler(reqObj, resObj);
                    if (maybe instanceof Response) return maybe;
                    if (sentResponse) return sentResponse;

                    if (maybe !== undefined) {
                        if (typeof maybe === "object") {
                            return new Response(JSON.stringify(maybe), {
                                headers: { "Content-Type": "application/json", ...globalHeaders },
                            });
                        }
                        return new Response(String(maybe), { headers: globalHeaders });
                    }

                    return new Response(null, { status: 204, headers: globalHeaders });

                } catch (err: any) {
                    const body =
                        typeof err === "string"
                            ? err
                            : JSON.stringify({ error: String(err) });

                    return new Response(body, {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json",
                            ...globalHeaders,
                        },
                    });
                }
            },
        });

        console.log(`Server listening (Bun) on http://localhost:${port}`);
        if (cb) cb();
    }

    return { get, post, listen, set };
}
