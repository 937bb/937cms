export interface CronParts {
  minute: number[];
  hour: number[];
  day: number[];
  month: number[];
  weekday: number[];
}

export class CronParser {
  static parse(expression: string): CronParts {
    const parts = String(expression || '')
      .trim()
      .split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression: must have 5 parts (minute hour day month weekday)');
    }

    return {
      minute: this.parsePart(parts[0], 0, 59),
      hour: this.parsePart(parts[1], 0, 23),
      day: this.parsePart(parts[2], 1, 31),
      month: this.parsePart(parts[3], 1, 12),
      weekday: this.parsePart(parts[4], 0, 6),
    };
  }

  private static parsePart(part: string, min: number, max: number): number[] {
    if (part === '*') return Array.from({ length: max - min + 1 }, (_, i) => min + i);

    const values: number[] = [];
    for (const segment of part.split(',')) {
      if (segment.includes('-')) {
        const [start, end] = segment.split('-').map(Number);
        if (!Number.isFinite(start) || !Number.isFinite(end))
          throw new Error(`Invalid range: ${segment}`);
        for (let i = Math.max(min, start); i <= Math.min(max, end); i++) values.push(i);
      } else if (segment.includes('/')) {
        const [range, step] = segment.split('/');
        const stepNum = Number(step);
        if (!Number.isFinite(stepNum) || stepNum <= 0) throw new Error(`Invalid step: ${segment}`);
        if (range === '*') {
          for (let i = min; i <= max; i += stepNum) values.push(i);
        } else {
          const start = Number(range);
          if (!Number.isFinite(start)) throw new Error(`Invalid range: ${segment}`);
          for (let i = start; i <= max; i += stepNum) values.push(i);
        }
      } else {
        const num = Number(segment);
        if (!Number.isFinite(num)) throw new Error(`Invalid value: ${segment}`);
        if (num < min || num > max) throw new Error(`Value out of range: ${segment}`);
        values.push(num);
      }
    }

    return [...new Set(values)].sort((a, b) => a - b);
  }

  static isTimeToRun(cron: string, now: Date = new Date()): boolean {
    try {
      const parts = this.parse(cron);
      const minute = now.getMinutes();
      const hour = now.getHours();
      const day = now.getDate();
      const month = now.getMonth() + 1;
      const weekday = now.getDay();

      return (
        parts.minute.includes(minute) &&
        parts.hour.includes(hour) &&
        parts.day.includes(day) &&
        parts.month.includes(month) &&
        parts.weekday.includes(weekday)
      );
    } catch {
      return false;
    }
  }

  static nextRunTime(cron: string, from: Date = new Date()): Date | null {
    try {
      const parts = this.parse(cron);
      let current = new Date(from);
      current.setSeconds(0);
      current.setMilliseconds(0);
      current.setMinutes(current.getMinutes() + 1);

      // 在 4 年内搜索下一次运行
      const maxIterations = 365 * 4 * 24 * 60;
      for (let i = 0; i < maxIterations; i++) {
        const minute = current.getMinutes();
        const hour = current.getHours();
        const day = current.getDate();
        const month = current.getMonth() + 1;
        const weekday = current.getDay();

        if (
          parts.minute.includes(minute) &&
          parts.hour.includes(hour) &&
          parts.day.includes(day) &&
          parts.month.includes(month) &&
          parts.weekday.includes(weekday)
        ) {
          return new Date(current);
        }

        current.setMinutes(current.getMinutes() + 1);
      }
      return null;
    } catch {
      return null;
    }
  }
}
