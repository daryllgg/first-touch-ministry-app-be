import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly httpService: HttpService) {}

  async notifyLineupStatus(lineup: {
    id: string;
    status: string;
    members: { user: { id: string; firstName: string; lastName: string }; instrumentRole: { name: string }; customRoleName: string | null }[];
    songs: { title: string; orderIndex: number; singer: { firstName: string; lastName: string } | null }[];
    reviews: { comment: string }[];
  }) {
    const chordsAppUrl = process.env.CHORDS_APP_URL;
    if (!chordsAppUrl) {
      this.logger.warn('CHORDS_APP_URL not configured, skipping webhook');
      return;
    }

    const latestReview = lineup.reviews?.length > 0
      ? lineup.reviews[lineup.reviews.length - 1]
      : null;

    const payload = {
      lineupId: lineup.id,
      status: lineup.status,
      reviewComment: latestReview?.comment || null,
      members: (lineup.members || []).map(m => ({
        userId: m.user.id,
        userName: `${m.user.firstName} ${m.user.lastName}`.trim(),
        instrumentRole: m.instrumentRole?.name || 'Other',
        customRoleName: m.customRoleName,
      })),
      songs: (lineup.songs || []).map(s => ({
        title: s.title,
        orderIndex: s.orderIndex,
        singerName: s.singer ? `${s.singer.firstName} ${s.singer.lastName}`.trim() : null,
      })),
    };

    try {
      await firstValueFrom(
        this.httpService.post(`${chordsAppUrl}/webhooks/lineup-status`, payload, {
          headers: {
            'x-webhook-secret': process.env.FTM_WEBHOOK_SECRET || '',
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }),
      );
      this.logger.log(`Webhook sent for lineup ${lineup.id} → ${lineup.status}`);
    } catch (err) {
      this.logger.error(`Webhook failed for lineup ${lineup.id}: ${err.message}`);
    }
  }

  async notifySubstitution(lineup: { id: string }, original: any, substitute: any, reason: string, status: string) {
    const chordsAppUrl = process.env.CHORDS_APP_URL;
    if (!chordsAppUrl) return;

    try {
      await firstValueFrom(
        this.httpService.post(`${chordsAppUrl}/webhooks/lineup-substitution`, {
          lineupId: lineup.id,
          originalMember: {
            userId: original.user.id,
            userName: `${original.user.firstName} ${original.user.lastName}`.trim(),
            role: original.instrumentRole?.name || 'Other',
          },
          substituteMember: {
            userId: substitute.id,
            userName: `${substitute.firstName} ${substitute.lastName}`.trim(),
            role: original.instrumentRole?.name || 'Other',
          },
          reason,
          status,
        }, {
          headers: {
            'x-webhook-secret': process.env.FTM_WEBHOOK_SECRET || '',
          },
          timeout: 5000,
        }),
      );
    } catch (err) {
      this.logger.error(`Substitution webhook failed: ${err.message}`);
    }
  }
}
