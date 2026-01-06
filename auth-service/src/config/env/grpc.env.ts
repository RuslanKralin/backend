import { registerAs } from '@nestjs/config';
import type { GrpcConfig } from '../interfaces';
import { validateEnv } from '../../shared/utils';
import { GrpcValidator } from '../validators';

export const grpcEnv = registerAs<GrpcConfig>('grpc', () => {
  validateEnv(process.env, GrpcValidator);
  return {
    GRPC_HOST: process.env.GRPC_HOST,
    GRPC_PORT: parseInt(process.env.GRPC_PORT),
  };
});
