import { LogItem, LogLevel } from '../types/logger';

export interface LogAnalysis {
  totalLogs: number;
  errorCount: number;
  errorFrequency: { [key: string]: number };
  categoryStats: { [key: string]: number };
  timeDistribution: { [key: string]: number };
  performanceMetrics?: {
    averageResponseTime?: number;
    maxResponseTime?: number;
    minResponseTime?: number;
  };
}

export class LogAnalyzer {
  analyze(logs: LogItem[]): LogAnalysis {
    const analysis: LogAnalysis = {
      totalLogs: logs.length,
      errorCount: 0,
      errorFrequency: {},
      categoryStats: {},
      timeDistribution: {}
    };

    logs.forEach(log => {
      // 统计错误
      if (log.level === 'error') {
        analysis.errorCount++;
        const errorKey = `${log.category}:${log.message}`;
        analysis.errorFrequency[errorKey] = (analysis.errorFrequency[errorKey] || 0) + 1;
      }

      // 统计分类
      analysis.categoryStats[log.category] = (analysis.categoryStats[log.category] || 0) + 1;

      // 时间分布
      const hour = new Date(log.timestamp).getHours();
      analysis.timeDistribution[hour] = (analysis.timeDistribution[hour] || 0) + 1;
    });

    return analysis;
  }

  searchLogs(logs: LogItem[], query: string): LogItem[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    return logs.filter(log => {
      const content = `${log.category} ${log.message} ${JSON.stringify(log.details)}`.toLowerCase();
      return searchTerms.every(term => content.includes(term));
    });
  }

  generateReport(logs: LogItem[]): string {
    const analysis = this.analyze(logs);
    
    return `
日志分析报告
============

总览
----
- 总日志数: ${analysis.totalLogs}
- 错误数量: ${analysis.errorCount}
- 错误率: ${((analysis.errorCount / analysis.totalLogs) * 100).toFixed(2)}%

错误频率 Top 5
-------------
${Object.entries(analysis.errorFrequency)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([error, count]) => `- ${error}: ${count}次`)
  .join('\n')}

分类统计
-------
${Object.entries(analysis.categoryStats)
  .map(([category, count]) => `- ${category}: ${count}条`)
  .join('\n')}

时间分布
-------
${Object.entries(analysis.timeDistribution)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([hour, count]) => `- ${hour}时: ${count}条`)
  .join('\n')}
`;
  }

  exportToCSV(logs: LogItem[]): string {
    const headers = ['时间', '级别', '分类', '消息', '详情'];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      log.category,
      log.message,
      JSON.stringify(log.details || '')
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}

export const logAnalyzer = new LogAnalyzer(); 