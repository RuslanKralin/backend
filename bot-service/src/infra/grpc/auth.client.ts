import { CONFIG } from "@/config";
import { loadSync } from "@grpc/proto-loader";
import { PROTO_PATH } from "@ticket_for_cinema/contracts";
import { loadPackageDefinition, credentials } from "@grpc/grpc-js";

const packageDef = loadSync(PROTO_PATH.AUTH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = loadPackageDefinition(packageDef) as any;

export const authClient = new proto.auth.v1.AuthService(
  CONFIG.AUTH_GRPC_URL,
  // TODO: есть нюансы в работе  grpc. В данном случае без шифрования,в противном случае (в проде!!!) нужно будет использовать credentials.createSsl()
  credentials.createInsecure(),
);
