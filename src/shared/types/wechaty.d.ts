declare module 'wechaty' {
  export class Wechaty {
    constructor(options?: any);
    on(event: string, listener: (...args: any[]) => void): this;
    start(): Promise<void>;
    Room: {
      find(query: { topic: string }): Promise<Room>;
    };
  }

  export class Contact {
    name(): string;
  }

  export class Message {
    self(): boolean;
    room(): Room | null;
    talker(): Contact;
    text(): string;
  }

  export class Room {
    topic(): Promise<string>;
    say(text: string): Promise<void>;
  }
} 