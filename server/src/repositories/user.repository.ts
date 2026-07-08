import { prisma } from '../config/db';

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { role: true } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
  }) {
    return prisma.user.create({ data, include: { role: true } });
  },

  findRoleByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },
};
