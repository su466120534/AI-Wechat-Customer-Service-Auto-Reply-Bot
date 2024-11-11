declare module 'wechaty-puppet' {
  export interface PuppetOptions {
    name?: string;
    endpoint?: string;
  }

  export class Puppet {
    constructor(options?: PuppetOptions);
  }

  // 如果需要其他类型定义，可以继续添加
} 