import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorshipLineup } from './entities/worship-lineup.entity';
import { LineupMember } from './entities/lineup-member.entity';
import { LineupSong } from './entities/lineup-song.entity';
import { InstrumentRole } from './entities/instrument-role.entity';
import { LineupReview } from './entities/lineup-review.entity';
import { SubstitutionRequest } from './entities/substitution-request.entity';
import { CreateWorshipLineupDto } from './dto/create-worship-lineup.dto';
import { CreateSubstitutionRequestDto } from './dto/create-substitution-request.dto';
import { LineupStatus } from './entities/lineup-status.enum';
import { SubstitutionStatus } from './entities/substitution-status.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification-type.enum';
import { RoleName } from '../users/entities/role.enum';

@Injectable()
export class WorshipLineupsService {
  constructor(
    @InjectRepository(WorshipLineup)
    private lineupsRepo: Repository<WorshipLineup>,
    @InjectRepository(LineupMember)
    private membersRepo: Repository<LineupMember>,
    @InjectRepository(LineupSong)
    private songsRepo: Repository<LineupSong>,
    @InjectRepository(InstrumentRole)
    private instrumentRolesRepo: Repository<InstrumentRole>,
    @InjectRepository(LineupReview)
    private reviewsRepo: Repository<LineupReview>,
    @InjectRepository(SubstitutionRequest)
    private substitutionsRepo: Repository<SubstitutionRequest>,
    private usersService: UsersService,
    @Optional() private notificationsService?: NotificationsService,
  ) {}

  async create(dto: CreateWorshipLineupDto, submittedBy: User): Promise<WorshipLineup> {
    const lineup = this.lineupsRepo.create({
      dates: dto.dates,
      serviceType: dto.serviceType,
      customServiceName: dto.customServiceName,
      submittedBy,
      notes: dto.notes,
    });
    const savedLineup = await this.lineupsRepo.save(lineup);

    for (const memberDto of dto.members) {
      const user = await this.usersService.findById(memberDto.userId);
      if (!user) throw new NotFoundException(`User ${memberDto.userId} not found`);

      const instrumentRole = await this.instrumentRolesRepo.findOne({ where: { id: memberDto.instrumentRoleId } });
      if (!instrumentRole) throw new NotFoundException(`Instrument role ${memberDto.instrumentRoleId} not found`);

      const member = this.membersRepo.create({
        lineup: savedLineup,
        user,
        instrumentRole,
      });
      await this.membersRepo.save(member);
    }

    if (dto.songs && dto.songs.length > 0) {
      for (let i = 0; i < dto.songs.length; i++) {
        const songDto = dto.songs[i];
        let singer: User | null = null;
        if (songDto.singerId) {
          singer = await this.usersService.findById(songDto.singerId);
          if (!singer) throw new NotFoundException(`User ${songDto.singerId} not found`);
        }

        const song = this.songsRepo.create({
          lineup: savedLineup,
          title: songDto.title,
          link: songDto.link,
          singer: singer || undefined,
          orderIndex: i,
        } as Partial<LineupSong>);
        await this.songsRepo.save(song as LineupSong);
      }
    }

    // Notify team heads and admins about new lineup submission
    if (this.notificationsService) {
      try {
        const allUsers = await this.usersService.findAll();
        const targetIds = allUsers
          .filter((u) =>
            u.roles?.some((r) =>
              [RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(r.name as RoleName),
            ) && u.id !== submittedBy.id,
          )
          .map((u) => u.id);
        if (targetIds.length > 0) {
          await this.notificationsService.createForMultipleUsers(
            targetIds,
            NotificationType.LINEUP_SUBMITTED,
            'New Lineup Submitted',
            `${submittedBy.firstName} submitted a new worship lineup`,
            savedLineup.id,
            'worship-lineup',
          );
        }
      } catch {
        // best-effort
      }
    }

    return this.findOne(savedLineup.id);
  }

  async findAll(): Promise<WorshipLineup[]> {
    return this.lineupsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<WorshipLineup> {
    const lineup = await this.lineupsRepo.findOne({ where: { id } });
    if (!lineup) throw new NotFoundException('Worship lineup not found');
    return lineup;
  }

  async updateStatus(id: string, status: LineupStatus, reviewedBy: User): Promise<WorshipLineup> {
    const lineup = await this.findOne(id);
    lineup.status = status;
    lineup.reviewedBy = reviewedBy;
    lineup.reviewedAt = new Date();
    await this.lineupsRepo.save(lineup);

    const review = this.reviewsRepo.create({
      lineup,
      reviewer: reviewedBy,
      status,
    });
    await this.reviewsRepo.save(review);

    // Notify submitter about lineup status change
    if (this.notificationsService && lineup.submittedBy) {
      try {
        const notifType = status === LineupStatus.APPROVED
          ? NotificationType.LINEUP_APPROVED
          : NotificationType.LINEUP_REJECTED;
        const statusLabel = status === LineupStatus.APPROVED ? 'approved' : 'rejected';
        await this.notificationsService.createForUser(
          lineup.submittedBy.id,
          notifType,
          `Lineup ${statusLabel}`,
          `Your worship lineup has been ${statusLabel} by ${reviewedBy.firstName}`,
          lineup.id,
          'worship-lineup',
        );
      } catch {
        // best-effort
      }
    }

    return this.findOne(id);
  }

  async requestChanges(id: string, comment: string, reviewer: User): Promise<WorshipLineup> {
    const lineup = await this.findOne(id);
    lineup.status = LineupStatus.CHANGES_REQUESTED;
    lineup.reviewedBy = reviewer;
    lineup.reviewedAt = new Date();
    await this.lineupsRepo.save(lineup);

    const review = this.reviewsRepo.create({
      lineup,
      reviewer,
      status: LineupStatus.CHANGES_REQUESTED,
      comment,
    });
    await this.reviewsRepo.save(review);

    // Notify submitter about changes requested
    if (this.notificationsService && lineup.submittedBy) {
      try {
        await this.notificationsService.createForUser(
          lineup.submittedBy.id,
          NotificationType.LINEUP_CHANGES_REQUESTED,
          'Changes Requested',
          `${reviewer.firstName} requested changes to your worship lineup`,
          lineup.id,
          'worship-lineup',
        );
      } catch {
        // best-effort
      }
    }

    return this.findOne(id);
  }

  async findInstrumentRoles(): Promise<InstrumentRole[]> {
    return this.instrumentRolesRepo.find({ order: { orderIndex: 'ASC' } });
  }

  async createInstrumentRole(name: string): Promise<InstrumentRole> {
    const role = this.instrumentRolesRepo.create({ name, isDefault: false });
    return this.instrumentRolesRepo.save(role);
  }

  async deleteInstrumentRole(id: string): Promise<void> {
    const role = await this.instrumentRolesRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Instrument role not found');
    await this.instrumentRolesRepo.remove(role);
  }

  async createSubstitutionRequest(
    dto: CreateSubstitutionRequestDto,
    requestedBy: User,
  ): Promise<SubstitutionRequest> {
    const lineupMember = await this.membersRepo.findOne({ where: { id: dto.lineupMemberId } });
    if (!lineupMember) throw new NotFoundException('Lineup member not found');

    let substituteUser: User | null = null;
    if (dto.substituteUserId) {
      substituteUser = await this.usersService.findById(dto.substituteUserId);
      if (!substituteUser) throw new NotFoundException(`User ${dto.substituteUserId} not found`);
    }

    const request = this.substitutionsRepo.create({
      lineupMember,
      requestedBy,
      substituteUser,
      reason: dto.reason,
    } as Partial<SubstitutionRequest>);
    const savedRequest = await this.substitutionsRepo.save(request as SubstitutionRequest);

    // Notify team heads about substitution request
    if (this.notificationsService) {
      try {
        const allUsers = await this.usersService.findAll();
        const teamHeadIds = allUsers
          .filter((u) =>
            u.roles?.some((r) =>
              [RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(r.name as RoleName),
            ) && u.id !== requestedBy.id,
          )
          .map((u) => u.id);
        if (teamHeadIds.length > 0) {
          await this.notificationsService.createForMultipleUsers(
            teamHeadIds,
            NotificationType.SUBSTITUTION_REQUEST,
            'Substitution Request',
            `${requestedBy.firstName} requested a substitution`,
            savedRequest.id,
            'substitution-request',
          );
        }
      } catch {
        // best-effort
      }
    }

    return savedRequest;
  }

  async updateSubstitutionStatus(
    id: string,
    status: SubstitutionStatus,
    respondedBy: User,
  ): Promise<SubstitutionRequest> {
    const request = await this.substitutionsRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Substitution request not found');
    request.status = status;
    request.respondedBy = respondedBy;
    request.respondedAt = new Date();
    const savedRequest = await this.substitutionsRepo.save(request);

    // Notify requester about substitution status
    if (this.notificationsService && request.requestedBy) {
      try {
        const notifType = status === SubstitutionStatus.APPROVED
          ? NotificationType.SUBSTITUTION_APPROVED
          : NotificationType.SUBSTITUTION_REJECTED;
        const statusLabel = status === SubstitutionStatus.APPROVED ? 'approved' : 'rejected';
        await this.notificationsService.createForUser(
          request.requestedBy.id,
          notifType,
          `Substitution ${statusLabel}`,
          `Your substitution request has been ${statusLabel} by ${respondedBy.firstName}`,
          request.id,
          'substitution-request',
        );
      } catch {
        // best-effort
      }
    }

    return savedRequest;
  }

  async findSubstitutionRequests(lineupId: string): Promise<SubstitutionRequest[]> {
    return this.substitutionsRepo.find({
      where: { lineupMember: { lineup: { id: lineupId } } },
      order: { createdAt: 'DESC' },
    });
  }

  async acceptSubstitution(substitutionId: string, user: User): Promise<SubstitutionRequest> {
    const request = await this.substitutionsRepo.findOne({ where: { id: substitutionId } });
    if (!request) throw new NotFoundException('Substitution request not found');
    request.status = SubstitutionStatus.ACCEPTED;
    request.substituteUser = user;
    return this.substitutionsRepo.save(request);
  }
}
