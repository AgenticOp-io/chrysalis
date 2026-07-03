export const SCHEMA_VERSION = "0.1.0";

export interface HubNativeRoute {
  readonly method: string;
  readonly path: string;
  readonly line: number;
  readonly name?: string;
}

export interface HubNativeParseResult {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly routes: ReadonlyArray<HubNativeRoute>;
}
