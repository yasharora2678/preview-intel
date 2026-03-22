import { BadRequestException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import {
  ProblemDocument,
  ProblemDocumentExtension,
} from 'http-problem-details';
import { ErrorMapper } from 'http-problem-details-mapper';
import { DtoValidation, InValidSignatureException } from './exceptions';

class BadRequestMapper {
  static mapError(
    error: Error,
    extension?: ProblemDocumentExtension,
  ): ProblemDocument {
    return new ProblemDocument(
      {
        title: 'Bad Request',
        detail: error.message,
        status: HttpStatus.BAD_REQUEST,
        type: '/problem/' + error.name,
      },
      extension,
    );
  }
}

class ForbiddenMapper {
  static mapError(
    error: Error,
    extension?: ProblemDocumentExtension,
  ): ProblemDocument {
    return new ProblemDocument(
      {
        title: 'Forbidden',
        detail: error.message,
        status: HttpStatus.FORBIDDEN,
        type: '/problem/' + error.name,
      },
      extension,
    );
  }
}

export class DtoValidationExceptionMapper extends ErrorMapper {
  constructor() {
    super(DtoValidation);
  }

  mapError(error: Error): ProblemDocument {
    const response =
      error instanceof DtoValidation ? error.getResponse() : null;
    const extension = new ProblemDocumentExtension({
      type_constant: 'DTO_VIOLATION',
      invalid_params:
        response && typeof response === 'object'
          ? (response as any)?.message
          : null,
    });
    return BadRequestMapper.mapError(error, extension);
  }
}

export class ValidationPipeExceptionMapper extends ErrorMapper {
  constructor() {
    super(BadRequestException);
  }
  mapError(error: Error): ProblemDocument {
    const extension = new ProblemDocumentExtension({
      type_constant: 'INVALID_UUID',
    });
    return BadRequestMapper.mapError(error, extension);
  }
}

export class UnAuthorizedExceptionMapper extends ErrorMapper {
  constructor() {
    super(InValidSignatureException);
  }

  mapError(error: Error): ProblemDocument {
    const extension = new ProblemDocumentExtension({
      type_constant: 'IS_UNAUTHORIZED',
    });
    return ForbiddenMapper.mapError(error, extension);
  }
}
