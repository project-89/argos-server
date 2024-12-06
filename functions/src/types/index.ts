export * from "./api";
export * from "./models";
export * from "./services";

// Additional utility types that don't fit in other categories
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

export type ErrorWithMessage = {
  message: string;
  [key: string]: any;
};
