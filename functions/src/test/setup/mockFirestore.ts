export class MockTimestamp {
  private seconds: number;
  private nanoseconds: number;

  constructor(seconds: number, nanoseconds: number = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
  }

  static now(): MockTimestamp {
    const now = Date.now();
    return new MockTimestamp(Math.floor(now / 1000), (now % 1000) * 1_000_000);
  }

  static fromMillis(milliseconds: number): MockTimestamp {
    return new MockTimestamp(Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1_000_000);
  }
}
