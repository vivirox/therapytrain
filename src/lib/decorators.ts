import { EventEmitter } from 'events';

export function singleton<T extends { new (...args: any[]): any }>(constructor: T) {
  const instances = new Map<any, any>();

  // Create a new constructor function
  const newConstructor = function(this: any, ...args: any[]) {
    // Check if we already have an instance
    if (instances.has(constructor)) {
      return instances.get(constructor);
    }

    // Create new instance
    const instance = new constructor(...args);
    instances.set(constructor, instance);

    // Copy static properties
    Object.getOwnPropertyNames(constructor).forEach(key => {
      if (key !== 'prototype' && key !== 'length' && key !== 'name') {
        const descriptor = Object.getOwnPropertyDescriptor(constructor, key);
        if (descriptor) {
          Object.defineProperty(newConstructor, key, descriptor);
        }
      }
    });

    return instance;
  };

  // Copy prototype
  newConstructor.prototype = constructor.prototype;

  // Copy static methods
  Object.getOwnPropertyNames(constructor).forEach(key => {
    if (key !== 'prototype' && key !== 'length' && key !== 'name') {
      const descriptor = Object.getOwnPropertyDescriptor(constructor, key);
      if (descriptor) {
        Object.defineProperty(newConstructor, key, descriptor);
      }
    }
  });

  // Handle EventEmitter static methods if needed
  if (constructor.prototype instanceof EventEmitter) {
    ['on', 'once', 'emit', 'addListener', 'removeListener', 'removeAllListeners'].forEach(method => {
      if (constructor.prototype[method]) {
        newConstructor.prototype[method] = constructor.prototype[method];
      }
    });
  }

  return newConstructor as unknown as T;
} 