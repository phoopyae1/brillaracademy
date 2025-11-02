declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    [key: string]: unknown;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    on(event: 'error', listener: (err: Error) => void): void;
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}
