import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

const POLLUTED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (!['body', 'query', 'param'].includes(metadata.type)) {
      return value;
    }

    return this.sanitizeValue(value);
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.sanitizeValue(entry));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce<
        Record<string, unknown>
      >((sanitizedObject, [key, nestedValue]) => {
        if (POLLUTED_KEYS.has(key)) {
          return sanitizedObject;
        }

        sanitizedObject[key] = this.sanitizeValue(nestedValue);
        return sanitizedObject;
      }, {});
    }

    if (typeof value === 'string') {
      return value.replace(/\u0000/g, '');
    }

    return value;
  }
}
