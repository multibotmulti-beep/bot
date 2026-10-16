import { FastifyInstance } from 'fastify';
import { UserService } from '@repo/domain';

export async function userRoutes(server: FastifyInstance) {
  server.get('/users', {
    schema: {
      description: 'Lista todos los usuarios registrados',
      tags: ['Users'],
    },
  }, async () => {
    const users = await UserService.getUsers();
    return { success: true, data: users };
  });

  server.post('/users', {
    schema: {
      description: 'Crea un nuevo usuario',
      tags: ['Users'],
    },
  }, async (request, reply) => {
    const user = await UserService.createUser(request.body as any);
    reply.status(201).send({ success: true, data: user });
  });

  server.delete('/users/:id', {
    schema: {
      description: 'Elimina un usuario por su ID',
      tags: ['Users'],
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    await UserService.deleteUser(id);
    return { success: true, message: 'Usuario eliminado correctamente' };
  });
}
