import { MapperRegistry } from 'http-problem-details-mapper';
import {
  DtoValidationExceptionMapper,
  InValidRawBodyExceptionMapper,
  InValidSignatureExceptionMapper,
  UnauthorizedExceptionMapper
} from './mappers';

export class MapperRegistryFactory {
  static create(): MapperRegistry {
    return new MapperRegistry({ useDefaultErrorMapper: false })
      .registerMapper(new DtoValidationExceptionMapper())
      .registerMapper(new InValidRawBodyExceptionMapper())
      .registerMapper(new InValidSignatureExceptionMapper())
      .registerMapper(new UnauthorizedExceptionMapper())
  }
}
