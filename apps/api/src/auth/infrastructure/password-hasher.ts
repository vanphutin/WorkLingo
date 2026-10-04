import { Injectable } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, {
      memoryCost: 19_456,
      parallelism: 1,
      timeCost: 2,
      algorithm: Algorithm.Argon2id,
    });
  }

  verify(hashValue: string, password: string): Promise<boolean> {
    return verify(hashValue, password);
  }
}
