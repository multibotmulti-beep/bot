import { FastifyInstance } from 'fastify';
import { CredentialService } from '@repo/domain';

export async function credentialRoutes(server: FastifyInstance) {
  server.get('/credentials', {
    schema: {
      description: 'Lista las credenciales de API configuradas',
      tags: ['Credentials'],
    },
  }, async () => {
    const credentials = await CredentialService.listCredentials();
    return { success: true, data: credentials };
  });

  server.post('/credentials', {
    schema: {
      description: 'Crea una nueva credencial de API',
      tags: ['Credentials'],
    },
  }, async (request, reply) => {
    const credential = await CredentialService.createCredential(request.body as any);
    reply.status(201).send({ success: true, data: credential });
  });

  server.delete('/credentials/:apiName', {
    schema: {
      description: 'Elimina una credencial de API por su nombre',
      tags: ['Credentials'],
    },
  }, async (request) => {
    const { apiName } = request.params as { apiName: string };
    await CredentialService.deleteCredential(apiName);
    return { success: true, message: `Credencial '${apiName}' eliminada correctamente` };
  });
}
