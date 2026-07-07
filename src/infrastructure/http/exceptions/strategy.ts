import {
  ProblemDocument,
  ProblemDocumentExtension,
} from 'http-problem-details';
import { MapperRegistry } from 'http-problem-details-mapper';

export class MappingStrategy {
  private registry: MapperRegistry;
  constructor(registry: MapperRegistry) {
    this.registry = registry;
  }

  map(error: Error) {
    const errorMapper = this.registry.getMapper(error);
    if (errorMapper) {
      return errorMapper.mapError(error);
    } else {
      return new ProblemDocument(
        {
          status: 500,
          title: 'Internal Server Error',
          detail: error.message,
          type: '/problem/' + error.name,
        },
        new ProblemDocumentExtension({
          type_constant: 'INTERNAL_SERVER_ERROR',
        }),
      );
    }
  }
}
