import { Timestamp } from "firebase-admin/firestore";

export class MockTimestamp extends Timestamp {
  constructor() {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const nanoseconds = (now % 1000) * 1000000;
    super(seconds, nanoseconds);
  }

  toMillis(): number {
    return Date.now();
  }
}
