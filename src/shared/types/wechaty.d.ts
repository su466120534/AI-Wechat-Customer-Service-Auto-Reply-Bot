import { Message as WechatyMessage } from 'wechaty'

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
    say(text: string): Promise<void | Message>;
  }

  export interface Message extends WechatyMessage {
    self(): boolean;
    talker(): Contact;
    room(): Room | null;
    text(): string;
    type(): number;
    mentionSelf(): Promise<boolean>;
    mentionText(): Promise<string>;
    mentionList(): Promise<Contact[]>;
  }

  export class Room {
    topic(): Promise<string>;
    say(text: string): Promise<void | Message>;
    memberAll(): Promise<Contact[]>;
  }
} 