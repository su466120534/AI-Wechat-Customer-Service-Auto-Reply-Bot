declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<any>;
      saveAitiwoKey: (key: string) => Promise<any>;
      saveWhitelist: (contacts: string[], rooms: string[]) => Promise<any>;
      startBot: () => Promise<any>;
      onQrcodeGenerated: (callback: (qrcode: string) => void) => void;
      onBotEvent: (callback: (event: string, data: any) => void) => void;
      // ... 其他API
    };
    scheduleManager: import('../modules/schedule').ScheduleManager;
  }
}

export {}; 