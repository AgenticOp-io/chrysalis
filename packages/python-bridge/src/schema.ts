export const SCHEMA_VERSION = "0.1.0";

export type PythonReturnNode =
  | { readonly t: "lit"; readonly v: string | number | boolean | null }
  | {
      readonly t: "ref";
      readonly source: "path" | "query" | "body" | "header" | "cookie";
      readonly name: string;
      readonly default?: unknown;
    }
  | { readonly t: "obj"; readonly entries: ReadonlyArray<{ readonly key: string; readonly value: PythonReturnNode }> };

export interface PythonSqlEffect {
  readonly sql: string;
  readonly params?: ReadonlyArray<PythonReturnNode>;
}

export interface PythonHubRoute {
  readonly method: string;
  readonly path: string;
  readonly line: number;
  readonly name: string;
  readonly returns?: string;
  readonly returnKind?: string;
  readonly returnValue?: unknown;
  readonly returnTree?: PythonReturnNode;
  readonly sqlEffects?: ReadonlyArray<PythonSqlEffect>;
}

export interface PythonHubParseResult {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly routes: ReadonlyArray<PythonHubRoute>;
  readonly error?: string;
}
