import { Express } from 'express';
import * as KindeAuth from '@kinde-oss/kinde-node-express';
import { config } from '../config';

export const setupKindeAuth = (app: Express) => {
  const kindeAuth = KindeAuth.default({
    clientId: config.kindeClientId,
    clientSecret: config.kindeClientSecret,
    domain: config.kindeDomain,
    audience: config.kindeAudience,
    issuer: config.kindeIssuer,
  });

  app.use(kindeAuth.middleware());

  return kindeAuth;
};
