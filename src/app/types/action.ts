export type Action<T = unknown> = (params: T) => Promise<void>;
export type ActionGroup = Record<string, Action>;