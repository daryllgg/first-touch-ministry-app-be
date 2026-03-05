import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PushToken } from './entities/push-token.entity';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Injectable()
export class PushNotificationsService {
  private firebaseApp: admin.app.App | null = null;

  constructor(
    @InjectRepository(PushToken)
    private pushTokenRepo: Repository<PushToken>,
    private configService: ConfigService,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    const projectId = this.configService.get('FIREBASE_PROJECT_ID');
    if (projectId) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: this.configService.get('FIREBASE_PROJECT_ID'),
            clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
            privateKey: this.configService
              .get<string>('FIREBASE_PRIVATE_KEY')
              ?.replace(/\\n/g, '\n'),
          }),
        });
      } catch (e) {
        console.warn('Firebase not initialized:', e.message);
      }
    } else {
      console.warn(
        'Firebase Push Notifications not configured (FIREBASE_PROJECT_ID not set)',
      );
    }
  }

  async registerToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<PushToken> {
    // Check if this token already exists for this user+platform
    let pushToken = await this.pushTokenRepo.findOne({
      where: {
        user: { id: userId },
        platform: dto.platform,
        token: dto.token,
      },
    });

    if (pushToken) {
      // Token already registered, just update timestamp
      pushToken.token = dto.token;
      return this.pushTokenRepo.save(pushToken);
    }

    // Create new token entry
    pushToken = this.pushTokenRepo.create({
      user: { id: userId } as any,
      token: dto.token,
      platform: dto.platform,
    });
    return this.pushTokenRepo.save(pushToken);
  }

  async removeToken(token: string): Promise<void> {
    await this.pushTokenRepo.delete({ token });
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseApp) return;

    const tokens = await this.pushTokenRepo.find({
      where: { user: { id: userId } },
    });
    if (tokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      tokens: tokens.map((t) => t.token),
      notification: { title, body },
      data: data || {},
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      // Clean up invalid tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          this.pushTokenRepo.delete({ token: tokens[idx].token });
        }
      });
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  async sendToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseApp) return;

    const tokens = await this.pushTokenRepo.find({
      where: { user: { id: In(userIds) } },
    });
    if (tokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      tokens: tokens.map((t) => t.token),
      notification: { title, body },
      data: data || {},
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      // Clean up invalid tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          this.pushTokenRepo.delete({ token: tokens[idx].token });
        }
      });
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }
}
