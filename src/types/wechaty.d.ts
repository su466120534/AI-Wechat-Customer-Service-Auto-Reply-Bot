import { Wechaty as WechatyType } from 'wechaty'

declare module 'wechaty' {
  export class Message {
    self(): boolean;
    room(): Room | null;
    talker(): Contact;
    text(): string;
    type(): number;
    mentionSelf(): Promise<boolean>;
    mentionText(): Promise<string>;

    static Type: {
      Unknown: 0,
      Attachment: 1,
      Audio: 2,
      Contact: 3,
      Emoticon: 4,
      Image: 5,
      Text: 7,
      Video: 8,
      Url: 9,
      MiniProgram: 10
    };
  }

  export class Contact {
    name(): string;
    alias(): Promise<string | null>;
    say(text: string): Promise<void>;
  }

  export class Room {
    topic(): Promise<string>;
    say(text: string): Promise<void>;
  }

  export class Wechaty {
    constructor(options: {
      name: string;
      puppet: string;
      puppetOptions?: {
        uos?: boolean;
        [key: string]: any;
      };
    });

    on(event: 'scan', listener: (qrcode: string, status: number) => void): this;
    on(event: 'login', listener: (user: Contact) => void): this;
    on(event: 'logout', listener: (user: Contact) => void): this;
    on(event: 'message', listener: (message: Message) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    
    start(): Promise<void>;
    stop(): Promise<void>;
  }
} 