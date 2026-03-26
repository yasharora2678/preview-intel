import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class DtoValidation extends BadRequestException {
  constructor(errors: ValidationError[]) {
    const messages = DtoValidation.extractMessages(errors);
    super(messages, 'Validation failed');
  }

  private static extractMessages(
    errors: ValidationError[],
    parentProperty: string = '',
  ): { name: string; message: string }[] {
    const messages = [];

    errors.forEach((error) => {
      const propertyName = parentProperty
        ? `${parentProperty}.${error.property}`
        : error.property;

      if (error.constraints) {
        messages.push({
          name: propertyName,
          message: Object.values(error.constraints).join(', '),
        });
      } else if (error?.children?.length) {
        const childMessages = this.extractMessages(
          error.children,
          propertyName,
        );
        messages.push(...childMessages);
      }
    });

    return messages;
  }
}

export class InValidSignatureException extends Error {
  constructor() {
    super('Missing webhook signature or invalid');
  }
}

export class InValidRawBodyException extends Error {
  constructor() {
    super('Missing raw body or invalid');
  }
}
