import { Injectable, ForbiddenException, NotFoundException, OnModuleInit, Optional, Logger } from '@nestjs/common';
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
import { ServiceType } from './entities/service-type.enum';
import { SubstitutionStatus } from './entities/substitution-status.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification-type.enum';
import { RoleName } from '../users/entities/role.enum';

@Injectable()
export class WorshipLineupsService implements OnModuleInit {
  private readonly logger = new Logger(WorshipLineupsService.name);
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

  private readonly defaultInstrumentRoles = [
    { name: 'Singer', orderIndex: 0 },
    { name: 'Drummer', orderIndex: 1 },
    { name: 'Bassist', orderIndex: 2 },
    { name: 'Acoustic Guitarist', orderIndex: 3 },
    { name: 'Electric Guitarist', orderIndex: 4 },
    { name: 'Rhythm Guitarist', orderIndex: 5 },
    { name: 'Keyboardist', orderIndex: 6 },
    { name: 'Sustain Piano', orderIndex: 7 },
    { name: 'Others', orderIndex: 8 },
  ];

  async onModuleInit() {
    const count = await this.instrumentRolesRepo.count();
    if (count === 0) {
      for (const role of this.defaultInstrumentRoles) {
        const entity = this.instrumentRolesRepo.create({ ...role, isDefault: true });
        await this.instrumentRolesRepo.save(entity);
      }
      this.logger.log('Seeded default instrument roles');
    }
  }

  async create(dto: CreateWorshipLineupDto, submittedBy: User): Promise<WorshipLineup> {
    const lineup = this.lineupsRepo.create({
      dates: dto.dates,
      serviceType: dto.serviceType,
      customServiceName: dto.customServiceName,
      submittedBy,
      notes: dto.notes,
      rehearsalDate: dto.rehearsalDate,
      overallTheme: dto.overallTheme,
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
        customRoleName: memberDto.customRoleName,
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

    // Notify team heads, admins, and lineup members about new lineup submission
    if (this.notificationsService) {
      try {
        const allUsers = await this.usersService.findAll();
        const approverIds = allUsers
          .filter((u) =>
            u.roles?.some((r) =>
              [RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(r.name as RoleName),
            ) && u.id !== submittedBy.id,
          )
          .map((u) => u.id);

        const memberIds = await this.getLineupMemberUserIds(savedLineup.id, submittedBy.id);

        const allTargetIds = [...new Set([...approverIds, ...memberIds])];
        if (allTargetIds.length > 0) {
          const fullLineup = await this.findOne(savedLineup.id);
          await this.notificationsService.createForMultipleUsers(
            allTargetIds,
            NotificationType.LINEUP_SUBMITTED,
            this.formatNotificationTitle(fullLineup),
            'Pending for approval',
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

  private async getLineupMemberUserIds(lineupId: string, excludeUserId?: string): Promise<string[]> {
    const members = await this.membersRepo.find({
      where: { lineup: { id: lineupId } },
      relations: ['user'],
    });
    return members
      .map((m) => m.user.id)
      .filter((id) => id !== excludeUserId);
  }

  private formatServiceType(type: string): string {
    switch (type) {
      case ServiceType.SUNDAY_SERVICE: return 'Sunday Service';
      case ServiceType.PLUG_IN_WORSHIP: return 'Plug In Worship';
      case ServiceType.YOUTH_SERVICE: return 'Youth Service';
      case ServiceType.SPECIAL_EVENT: return 'Special Event';
      default: return type;
    }
  }

  private formatNotificationTitle(lineup: WorshipLineup): string {
    const serviceLabel = lineup.serviceType === ServiceType.SPECIAL_EVENT && lineup.customServiceName
      ? lineup.customServiceName
      : this.formatServiceType(lineup.serviceType);
    const dateStr = lineup.dates
      .map((d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
      .join(', ');
    return `${serviceLabel} - ${dateStr}`;
  }

  async findAll(): Promise<WorshipLineup[]> {
    return this.lineupsRepo.createQueryBuilder('lineup')
      .leftJoinAndSelect('lineup.submittedBy', 'submittedBy')
      .leftJoinAndSelect('lineup.reviewedBy', 'reviewedBy')
      .leftJoinAndSelect('lineup.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .leftJoinAndSelect('members.instrumentRole', 'instrumentRole')
      .leftJoinAndSelect('lineup.songs', 'songs')
      .leftJoinAndSelect('songs.singer', 'singer')
      .leftJoinAndSelect('lineup.reviews', 'reviews')
      .leftJoinAndSelect('reviews.reviewer', 'reviewer')
      .orderBy('lineup.createdAt', 'DESC')
      .getMany();
  }

  async findForUser(userId: string): Promise<WorshipLineup[]> {
    return this.lineupsRepo.createQueryBuilder('lineup')
      .leftJoinAndSelect('lineup.submittedBy', 'submittedBy')
      .leftJoinAndSelect('lineup.reviewedBy', 'reviewedBy')
      .leftJoinAndSelect('lineup.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .leftJoinAndSelect('members.instrumentRole', 'instrumentRole')
      .leftJoinAndSelect('lineup.songs', 'songs')
      .leftJoinAndSelect('songs.singer', 'singer')
      .leftJoinAndSelect('lineup.reviews', 'reviews')
      .leftJoinAndSelect('reviews.reviewer', 'reviewer')
      .where('submittedBy.id = :userId', { userId })
      .orWhere('memberUser.id = :userId', { userId })
      .orderBy('lineup.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<WorshipLineup> {
    const lineup = await this.lineupsRepo.findOne({ where: { id } });
    if (!lineup) throw new NotFoundException('Worship lineup not found');
    return lineup;
  }

  async updateStatus(id: string, status: LineupStatus, reviewedBy: User, comment?: string): Promise<WorshipLineup> {
    const lineup = await this.findOne(id);
    lineup.status = status;
    lineup.reviewedBy = reviewedBy;
    lineup.reviewedAt = new Date();
    await this.lineupsRepo.save(lineup);

    const review = this.reviewsRepo.create({
      lineup,
      reviewer: reviewedBy,
      status,
      comment: comment || undefined,
    });
    await this.reviewsRepo.save(review);

    // Notify submitter and all lineup members about status change
    if (this.notificationsService) {
      try {
        const notifType = status === LineupStatus.APPROVED
          ? NotificationType.LINEUP_APPROVED
          : NotificationType.LINEUP_REJECTED;
        const statusLabel = status === LineupStatus.APPROVED ? 'approved' : 'rejected';
        const memberIds = await this.getLineupMemberUserIds(id, reviewedBy.id);
        const allTargetIds = [...new Set([
          ...(lineup.submittedBy?.id !== reviewedBy.id ? [lineup.submittedBy.id] : []),
          ...memberIds,
        ])];
        if (allTargetIds.length > 0) {
          const subtitle = status === LineupStatus.APPROVED ? 'Approved' : 'Declined';
          await this.notificationsService.createForMultipleUsers(
            allTargetIds,
            notifType,
            this.formatNotificationTitle(lineup),
            subtitle,
            lineup.id,
            'worship-lineup',
          );
        }
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

    // Notify submitter and all lineup members about changes requested
    if (this.notificationsService) {
      try {
        const memberIds = await this.getLineupMemberUserIds(id, reviewer.id);
        const allTargetIds = [...new Set([
          ...(lineup.submittedBy?.id !== reviewer.id ? [lineup.submittedBy.id] : []),
          ...memberIds,
        ])];
        if (allTargetIds.length > 0) {
          await this.notificationsService.createForMultipleUsers(
            allTargetIds,
            NotificationType.LINEUP_CHANGES_REQUESTED,
            this.formatNotificationTitle(lineup),
            'Changes requested',
            lineup.id,
            'worship-lineup',
          );
        }
      } catch {
        // best-effort
      }
    }

    return this.findOne(id);
  }

  async resubmit(id: string, user: User): Promise<WorshipLineup> {
    const lineup = await this.findOne(id);
    if (lineup.submittedBy.id !== user.id) {
      throw new ForbiddenException('Only the submitter can resubmit');
    }
    lineup.status = LineupStatus.PENDING;
    lineup.reviewedBy = null as any;
    lineup.reviewedAt = null as any;
    await this.lineupsRepo.save(lineup);

    const review = this.reviewsRepo.create({
      lineup,
      reviewer: user,
      status: LineupStatus.PENDING,
      comment: 'Resubmitted',
    });
    await this.reviewsRepo.save(review);

    // Notify approvers and members
    if (this.notificationsService) {
      try {
        const allUsers = await this.usersService.findAll();
        const approverIds = allUsers
          .filter((u) =>
            u.roles?.some((r) =>
              [RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(r.name as RoleName),
            ) && u.id !== user.id,
          )
          .map((u) => u.id);
        const memberIds = await this.getLineupMemberUserIds(id, user.id);
        const allTargetIds = [...new Set([...approverIds, ...memberIds])];
        if (allTargetIds.length > 0) {
          await this.notificationsService.createForMultipleUsers(
            allTargetIds,
            NotificationType.LINEUP_SUBMITTED,
            this.formatNotificationTitle(lineup),
            'Resubmitted for approval',
            lineup.id,
            'worship-lineup',
          );
        }
      } catch {
        // best-effort
      }
    }

    return this.findOne(id);
  }

  async update(id: string, dto: CreateWorshipLineupDto, user: User): Promise<WorshipLineup> {
    const lineup = await this.findOne(id);
    if (lineup.submittedBy.id !== user.id) {
      throw new ForbiddenException('Only the submitter can edit');
    }

    // Capture old state before changes (for diff + notifications)
    const oldMemberUserIds = await this.getLineupMemberUserIds(id);
    const oldMembers = await this.membersRepo.find({
      where: { lineup: { id } },
      relations: ['user', 'instrumentRole'],
    });
    const oldDates = [...lineup.dates];
    const oldServiceType = lineup.serviceType;
    const oldCustomServiceName = lineup.customServiceName;
    const oldNotes = lineup.notes;
    const oldRehearsalDate = lineup.rehearsalDate;
    const oldOverallTheme = lineup.overallTheme;
    const oldSongs = lineup.songs?.map((s) => ({ title: s.title, link: s.link || null, singerName: s.singer ? `${s.singer.firstName} ${s.singer.lastName}` : null })) || [];

    lineup.dates = dto.dates;
    lineup.serviceType = dto.serviceType;
    lineup.customServiceName = dto.customServiceName || (null as any);
    lineup.notes = dto.notes || (null as any);
    lineup.rehearsalDate = dto.rehearsalDate || (null as any);
    lineup.overallTheme = dto.overallTheme || (null as any);
    lineup.status = LineupStatus.PENDING;
    lineup.reviewedBy = null as any;
    lineup.reviewedAt = null as any;
    await this.lineupsRepo.save(lineup);

    // Remove old members and songs
    await this.membersRepo.delete({ lineup: { id } });
    await this.songsRepo.delete({ lineup: { id } });

    // Re-create members
    for (const memberDto of dto.members) {
      const memberUser = await this.usersService.findById(memberDto.userId);
      if (!memberUser) throw new NotFoundException(`User ${memberDto.userId} not found`);
      const instrumentRole = await this.instrumentRolesRepo.findOne({ where: { id: memberDto.instrumentRoleId } });
      if (!instrumentRole) throw new NotFoundException(`Instrument role ${memberDto.instrumentRoleId} not found`);
      const member = this.membersRepo.create({ lineup, user: memberUser, instrumentRole, customRoleName: memberDto.customRoleName });
      await this.membersRepo.save(member);
    }

    // Re-create songs
    if (dto.songs && dto.songs.length > 0) {
      for (let i = 0; i < dto.songs.length; i++) {
        const songDto = dto.songs[i];
        let singer: User | null = null;
        if (songDto.singerId) {
          singer = await this.usersService.findById(songDto.singerId);
        }
        const song = this.songsRepo.create({
          lineup,
          title: songDto.title,
          link: songDto.link,
          singer: singer || undefined,
          orderIndex: i,
        } as Partial<LineupSong>);
        await this.songsRepo.save(song as LineupSong);
      }
    }

    // Build comprehensive change description
    const newMembers = await this.membersRepo.find({
      where: { lineup: { id } },
      relations: ['user', 'instrumentRole'],
    });
    const changeParts: string[] = [];

    // Service type change
    if (oldServiceType !== dto.serviceType) {
      changeParts.push(`Service type: ${this.formatServiceType(oldServiceType)} → ${this.formatServiceType(dto.serviceType)}`);
    }

    // Custom service name change
    const newCustomName = dto.customServiceName || null;
    if (oldCustomServiceName !== newCustomName && dto.serviceType === 'SPECIAL_EVENT') {
      changeParts.push(`Event name: ${oldCustomServiceName || '(none)'} → ${newCustomName || '(none)'}`);
    }

    // Date changes
    const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const oldDatesSorted = [...oldDates].sort();
    const newDatesSorted = [...dto.dates].sort();
    if (JSON.stringify(oldDatesSorted) !== JSON.stringify(newDatesSorted)) {
      const addedDates = dto.dates.filter((d) => !oldDates.includes(d));
      const removedDates = oldDates.filter((d) => !dto.dates.includes(d));
      if (addedDates.length > 0) changeParts.push(`Dates added: ${addedDates.map(formatDate).join(', ')}`);
      if (removedDates.length > 0) changeParts.push(`Dates removed: ${removedDates.map(formatDate).join(', ')}`);
    }

    // Notes change
    const newNotes = dto.notes || null;
    if ((oldNotes || null) !== newNotes) {
      changeParts.push('Notes updated');
    }

    // Rehearsal date change
    if ((oldRehearsalDate || null) !== (dto.rehearsalDate || null)) {
      changeParts.push(`Rehearsal date: ${oldRehearsalDate ? formatDate(oldRehearsalDate) : '(none)'} → ${dto.rehearsalDate ? formatDate(dto.rehearsalDate) : '(none)'}`);
    }

    // Overall theme change
    if ((oldOverallTheme || null) !== (dto.overallTheme || null)) {
      changeParts.push('Overall theme updated');
    }

    // Member changes
    const oldMemberKeys = oldMembers.map((m) => m.user.id);
    const newMemberKeys = newMembers.map((m) => m.user.id);
    const addedMembers = newMembers.filter((m) => !oldMemberKeys.includes(m.user.id));
    const removedMembers = oldMembers.filter((m) => !newMemberKeys.includes(m.user.id));
    if (addedMembers.length > 0) {
      changeParts.push('Members added: ' + addedMembers.map((m) => `${m.user.firstName} ${m.user.lastName} (${m.instrumentRole.name})`).join(', '));
    }
    if (removedMembers.length > 0) {
      changeParts.push('Members removed: ' + removedMembers.map((m) => `${m.user.firstName} ${m.user.lastName} (${m.instrumentRole.name})`).join(', '));
    }

    // Song changes
    const newSongs = (dto.songs || []).map((s) => s.title);
    const oldSongTitles = oldSongs.map((s) => s.title);
    const addedSongs = newSongs.filter((t) => !oldSongTitles.includes(t));
    const removedSongs = oldSongTitles.filter((t) => !newSongs.includes(t));
    if (addedSongs.length > 0) changeParts.push(`Songs added: ${addedSongs.join(', ')}`);
    if (removedSongs.length > 0) changeParts.push(`Songs removed: ${removedSongs.join(', ')}`);

    const changeComment = changeParts.length > 0 ? changeParts.join('. ') : 'Lineup updated';

    // Add review entry
    const review = this.reviewsRepo.create({
      lineup,
      reviewer: user,
      status: LineupStatus.PENDING,
      comment: changeComment,
    });
    await this.reviewsRepo.save(review);

    // Notify all involved
    if (this.notificationsService) {
      try {
        const allUsers = await this.usersService.findAll();
        const approverIds = allUsers
          .filter((u) =>
            u.roles?.some((r) =>
              [RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(r.name as RoleName),
            ) && u.id !== user.id,
          )
          .map((u) => u.id);
        const memberIds = await this.getLineupMemberUserIds(id, user.id);
        const allTargetIds = [...new Set([...approverIds, ...memberIds])];
        if (allTargetIds.length > 0) {
          const updatedLineup = await this.findOne(id);
          await this.notificationsService.createForMultipleUsers(
            allTargetIds,
            NotificationType.LINEUP_SUBMITTED,
            this.formatNotificationTitle(updatedLineup),
            'Lineup updated - Pending for approval',
            lineup.id,
            'worship-lineup',
          );
        }

        // Notify removed members
        const newMemberUserIds = await this.getLineupMemberUserIds(id);
        const removedUserIds = oldMemberUserIds.filter(
          (uid) => !newMemberUserIds.includes(uid),
        );
        if (removedUserIds.length > 0) {
          const updatedLineup2 = await this.findOne(id);
          await this.notificationsService.createForMultipleUsers(
            removedUserIds,
            NotificationType.LINEUP_MEMBER_REMOVED,
            this.formatNotificationTitle(updatedLineup2),
            'You have been removed from this lineup',
            lineup.id,
            'worship-lineup',
          );
        }
      } catch {
        // best-effort
      }
    }

    return this.findOne(id);
  }

  async findInstrumentRoles(): Promise<InstrumentRole[]> {
    return this.instrumentRolesRepo.find({ order: { orderIndex: 'ASC' } });
  }

  async delete(id: string, user: User): Promise<void> {
    const lineup = await this.lineupsRepo.findOne({ where: { id } });
    if (!lineup) throw new NotFoundException('Worship lineup not found');
    if (lineup.submittedBy.id !== user.id) {
      throw new ForbiddenException('Only the submitter can delete this lineup');
    }

    // Determine if notifications should be sent
    const shouldNotify = this.shouldNotifyOnDelete(lineup);

    if (shouldNotify && this.notificationsService) {
      try {
        const memberIds = await this.getLineupMemberUserIds(id, user.id);
        if (memberIds.length > 0) {
          const title = this.formatNotificationTitle(lineup);
          await this.notificationsService.createForMultipleUsers(
            memberIds,
            NotificationType.LINEUP_DELETED,
            title,
            `This worship lineup has been deleted by ${user.firstName} ${user.lastName}`,
            id,
            'worship-lineup',
          );
        }
      } catch {
        // best-effort
      }
    }

    // Delete substitution requests for this lineup's members
    const members = await this.membersRepo.find({ where: { lineup: { id } } });
    for (const member of members) {
      await this.substitutionsRepo.delete({ lineupMember: { id: member.id } });
    }

    // Delete lineup members
    await this.membersRepo.delete({ lineup: { id } });

    // Delete lineup (songs + reviews cascade)
    await this.lineupsRepo.remove(lineup);
  }

  private shouldNotifyOnDelete(lineup: WorshipLineup): boolean {
    // Do NOT notify if declined
    if (lineup.status === LineupStatus.REJECTED) return false;

    // Do NOT notify if approved AND all dates have passed
    if (lineup.status === LineupStatus.APPROVED) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allDatesPassed = lineup.dates.every(d => {
        const date = new Date(d + 'T00:00:00');
        return date < today;
      });
      if (allDatesPassed) return false;
    }

    return true;
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
