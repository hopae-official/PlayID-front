/**
 * Generated by orval v7.3.0 🍺
 * Do not edit manually.
 * Play.ID API
 * Esports API for Play.ID
 * OpenAPI spec version: 1.0
 */
import type { SignInResponseDtoRole } from './signInResponseDtoRole';
import type { User } from './user';

export interface SignInResponseDto {
  existingUser?: boolean;
  role: SignInResponseDtoRole;
  token: string;
  user: User;
}
