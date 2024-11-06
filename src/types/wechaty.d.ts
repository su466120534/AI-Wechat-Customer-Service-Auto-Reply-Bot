declare module 'wechaty' {
  export class Wechaty {
    constructor(options?: any);
    on(event: string, listener: (...args: any[]) => void): this;
    start(): Promise<void>;
    Room: {
      find(query: { topic: string }): Promise<any>;
    };
  }
} 