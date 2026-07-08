import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { userRepository } from '../repositories/user.repository';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

const toPublicUser = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isEmailVerified: boolean;
  role: { name: string };
}) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  isEmailVerified: user.isEmailVerified,
  role: user.role.name,
});

const signTokens = (user: { id: string; email: string; role: { name: string } }) => {
  const payload = { id: user.id, email: user.email, role: user.role.name };
  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as SignOptions);
  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
  return { accessToken, refreshToken };
};

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const customerRole = await userRepository.findRoleByName('CUSTOMER');
    if (!customerRole) throw new ApiError(500, 'CUSTOMER role missing — run the database seed');

    const hashed = await bcrypt.hash(input.password, 10);
    const user = await userRepository.create({
      ...input,
      password: hashed,
      roleId: customerRole.id,
    });

    return { user: toPublicUser(user), ...signTokens(user) };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is not active');

    return { user: toPublicUser(user), ...signTokens(user) };
  },

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { id: string };
      const user = await userRepository.findById(payload.id);
      if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Invalid session');
      return { user: toPublicUser(user), ...signTokens(user) };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },
};
