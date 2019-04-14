export interface Syn {
    readonly type: string;
    readonly range?: [number, number];
    readonly loc?: SourceLocation;
}

export interface Position {
    readonly line: number;
    readonly column: number;
}

export interface SourceLocation {
    readonly start: Position;
    readonly end: Position;
    readonly source?: string | null;
}