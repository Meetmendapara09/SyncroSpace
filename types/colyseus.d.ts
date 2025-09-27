/// <reference types="node" />

declare module "@colyseus/schema" {
  export class Schema {
    constructor();
  }

  export class MapSchema<T = any> extends Map<string, T> {
    constructor();
  }

  export class ArraySchema<T = any> extends Array<T> {
    constructor();
  }

  export function type(
    definition: string | any
  ): PropertyDecorator;

  export function type(
    definition: { map: any } | { array: any } | [any] | any
  ): PropertyDecorator;
}

// Global type decorator for better TypeScript support
declare const type: (definition: string | any | { map: any } | { array: any } | [any]) => PropertyDecorator;