declare module "module-alias" {
  export function addAliases(aliases: { [key: string]: string }): void;
  export function addPath(path: string): void;
  export function isPathMatchesAlias(path: string, alias: string): boolean;
  export function reset(): void;
}
