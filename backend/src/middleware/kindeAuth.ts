import { Express } from 'express';
import { KindeAuth } from '@kinde-oss/kinde-node-express';
import { config } from '../config';

export const setupKindeAuth = (app: Express) => {
  const kindeAuth = new KindeAuth({
    clientId: config.kindeClientId,
    clientSecret: config.kindeClientSecret,
    domain: config.kindeDomain,
    audience: config.kindeAudience,
    issuer: config.kindeIssuer,
  });

  app.use(kindeAuth.middleware());

  return kindeAuth;
};
