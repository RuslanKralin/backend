import { join } from "path";
import type { GrpcOptions } from "@nestjs/microservices";

export const grpcPackages = ["auth.v1", "account.v1"];

export const grpcProtoPath = [
  join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "node_modules",
    "@ticket_for_cinema",
    "contracts",
    "proto",
    "auth.proto",
  ),
  join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "node_modules",
    "@ticket_for_cinema",
    "contracts",
    "proto",
    "account.proto",
  ),
];

export const grpcLoader: NonNullable<GrpcOptions["options"]["loader"]> = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
