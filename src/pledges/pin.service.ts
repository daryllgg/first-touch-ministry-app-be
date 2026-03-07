import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserPin } from './entities/user-pin.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PinService {
  constructor(
    @InjectRepository(UserPin)
    private pinRepo: Repository<UserPin>,
  ) {}

  async hasPin(user: User): Promise<boolean> {
    const pin = await this.pinRepo.findOne({ where: { user: { id: user.id } } });
    return !!pin;
  }

  async setup(user: User, pin: string): Promise<{ success: boolean }> {
    const existing = await this.pinRepo.findOne({ where: { user: { id: user.id } } });
    if (existing) {
      throw new BadRequestException('PIN already set. Use change endpoint.');
    }
    const pinHash = await bcrypt.hash(pin, 10);
    const userPin = this.pinRepo.create({ user, pinHash });
    await this.pinRepo.save(userPin);
    return { success: true };
  }

  async verify(user: User, pin: string): Promise<{ verified: boolean }> {
    const userPin = await this.pinRepo.findOne({ where: { user: { id: user.id } } });
    if (!userPin) {
      throw new BadRequestException('PIN not set. Use setup endpoint first.');
    }

    // Check lockout
    if (userPin.lockedUntil && userPin.lockedUntil > new Date()) {
      const minutes = Math.ceil((userPin.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`Too many attempts. Try again in ${minutes} minute(s).`);
    }

    const isValid = await bcrypt.compare(pin, userPin.pinHash);
    if (!isValid) {
      userPin.failedAttempts += 1;
      if (userPin.failedAttempts >= 5) {
        userPin.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }
      await this.pinRepo.save(userPin);
      const remaining = 5 - userPin.failedAttempts;
      if (remaining <= 0) {
        throw new ForbiddenException('Too many attempts. Locked for 15 minutes.');
      }
      throw new BadRequestException(`Invalid PIN. ${remaining} attempt(s) remaining.`);
    }

    // Reset on success
    userPin.failedAttempts = 0;
    userPin.lockedUntil = null;
    await this.pinRepo.save(userPin);
    return { verified: true };
  }

  async change(user: User, currentPin: string, newPin: string): Promise<{ success: boolean }> {
    const result = await this.verify(user, currentPin);
    if (!result.verified) {
      throw new BadRequestException('Current PIN is incorrect.');
    }
    const userPin = await this.pinRepo.findOne({ where: { user: { id: user.id } } });
    userPin!.pinHash = await bcrypt.hash(newPin, 10);
    await this.pinRepo.save(userPin!);
    return { success: true };
  }
}
