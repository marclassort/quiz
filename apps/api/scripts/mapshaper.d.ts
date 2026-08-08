// mapshaper ne publie pas de types.
declare module 'mapshaper' {
  export function applyCommands(
    commands: string,
    input: Record<string, string>,
    callback: (error: Error | null, output: Record<string, string>) => void,
  ): void;
}
