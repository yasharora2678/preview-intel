import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { MapperRegistryFactory } from './registry';
import { MappingStrategy } from './strategy';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const mappingStrategy = new MappingStrategy(MapperRegistryFactory.create());
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const problemDetails = mappingStrategy.map(exception);
    if (problemDetails) {
      problemDetails.instance = req?.url;
      return response.status(problemDetails.status).json(problemDetails);
    }
    super.catch(exception, host);
  }
}
