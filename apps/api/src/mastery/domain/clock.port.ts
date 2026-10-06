export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class TestClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: Date) {
    this.currentTime = new Date(initialTime.getTime());
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  advanceDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  setTime(time: Date): void {
    this.currentTime = new Date(time.getTime());
  }
}
