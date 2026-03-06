import { Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { RoleName } from './entities/role.enum';
import { Gender } from './entities/gender.enum';
import { AccountStatus } from './entities/account-status.enum';
import { ProfileChangeRequest } from './entities/profile-change-request.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification-type.enum';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
    @InjectRepository(ProfileChangeRequest) private profileChangeRepo: Repository<ProfileChangeRequest>,
    private dataSource: DataSource,
    @Optional() private notificationsService?: NotificationsService,
  ) {}

  async onModuleInit() {
    // Migration: ensure users with roles are marked APPROVED
    // (handles transition from old isApproved boolean to accountStatus enum)
    try {
      // Step 1: Try migrating via old isApproved column if it still exists
      const hasColumn = await this.dataSource.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isApproved'`,
      );
      if (hasColumn.length > 0) {
        await this.dataSource.query(
          `UPDATE users SET "accountStatus" = 'APPROVED' WHERE "isApproved" = true AND "accountStatus" = 'PENDING'`,
        );
        this.logger.log('Migrated isApproved=true users to accountStatus=APPROVED');
        await this.dataSource.query(`ALTER TABLE users DROP COLUMN "isApproved"`);
        this.logger.log('Dropped legacy isApproved column');
      }

      // Step 2: Fallback — any user with roles assigned but still PENDING should be APPROVED
      const pendingWithRoles = await this.usersRepo.find({
        where: { accountStatus: AccountStatus.PENDING },
        relations: ['roles'],
      });
      const usersToFix = pendingWithRoles.filter(u => u.roles && u.roles.length > 0);
      if (usersToFix.length > 0) {
        for (const user of usersToFix) {
          user.accountStatus = AccountStatus.APPROVED;
        }
        await this.usersRepo.save(usersToFix);
        this.logger.log(`Fixed ${usersToFix.length} users with roles stuck as PENDING → APPROVED`);
      }
    } catch (err) {
      this.logger.warn('Account status migration error:', err?.message || err);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    contactNumber?: string;
    birthday?: string;
    gender?: Gender;
    address?: string;
    middleName?: string;
    invitedBy?: string;
    facebookLink?: string;
    firstDateAttendedChurch?: string;
    dateBaptized?: string;
  }): Promise<User> {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async findRoleByName(name: RoleName): Promise<Role | null> {
    return this.rolesRepo.findOne({ where: { name } });
  }

  async assignRole(userId: string, roleName: RoleName): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    const role = await this.rolesRepo.findOne({ where: { name: roleName } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);
    if (!role) throw new NotFoundException(`Role ${roleName} not found`);

    const alreadyHasRole = user.roles.some(r => r.id === role.id);
    if (!alreadyHasRole) {
      user.roles.push(role);
    }
    return this.usersRepo.save(user);
  }

  async approveUser(userId: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);
    user.accountStatus = AccountStatus.APPROVED;
    const saved = await this.usersRepo.save(user);

    if (this.notificationsService) {
      try {
        await this.notificationsService.createForUser(
          userId,
          NotificationType.USER_APPROVED,
          'Account Approved',
          'Your account has been approved. Welcome!',
          userId,
          'user',
        );
      } catch {
        // best-effort
      }
    }

    return saved;
  }

  async findPendingUsers(): Promise<User[]> {
    return this.usersRepo.find({ where: { accountStatus: AccountStatus.PENDING } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }

  async requestProfileUpdate(userId: string, changes: Record<string, any>): Promise<ProfileChangeRequest> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    const request = this.profileChangeRepo.create({
      user,
      requestedChanges: changes,
      status: 'PENDING',
    });
    const saved = await this.profileChangeRepo.save(request);

    // Notify admins about the profile change request
    if (this.notificationsService) {
      try {
        const allUsers = await this.usersRepo.find({ relations: ['roles'] });
        const adminIds = allUsers
          .filter((u) =>
            u.roles?.some((r) =>
              [RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(r.name as RoleName),
            ) && u.id !== userId,
          )
          .map((u) => u.id);
        if (adminIds.length > 0) {
          await this.notificationsService.createForMultipleUsers(
            adminIds,
            NotificationType.PROFILE_CHANGE_REQUESTED,
            'Profile Change Request',
            `${user.firstName} ${user.lastName} requested a profile update`,
            saved.id,
            'profile-change-request',
          );
        }
      } catch {
        // best-effort
      }
    }

    return saved;
  }

  async findPendingProfileChanges(): Promise<ProfileChangeRequest[]> {
    return this.profileChangeRepo.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
  }

  async approveProfileChange(requestId: string, admin: User): Promise<ProfileChangeRequest> {
    const request = await this.profileChangeRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Profile change request with id ${requestId} not found`);

    const user = await this.usersRepo.findOne({ where: { id: request.user.id } });
    if (!user) throw new NotFoundException(`User not found`);

    // Apply all requested changes to the user entity
    const allowedFields = ['firstName', 'lastName', 'contactNumber', 'birthday', 'gender', 'address', 'middleName', 'invitedBy', 'facebookLink', 'firstDateAttendedChurch', 'dateBaptized'];
    for (const [key, value] of Object.entries(request.requestedChanges)) {
      if (allowedFields.includes(key)) {
        (user as any)[key] = value;
      }
    }
    await this.usersRepo.save(user);

    request.status = 'APPROVED';
    request.reviewedBy = admin;
    request.reviewedAt = new Date();
    const saved = await this.profileChangeRepo.save(request);

    if (this.notificationsService) {
      try {
        await this.notificationsService.createForUser(
          request.user.id,
          NotificationType.PROFILE_CHANGE_APPROVED,
          'Profile Update Approved',
          'Your profile change request has been approved',
          request.id,
          'profile-change-request',
        );
      } catch {
        // best-effort
      }
    }

    return saved;
  }

  async rejectProfileChange(requestId: string, admin: User): Promise<ProfileChangeRequest> {
    const request = await this.profileChangeRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Profile change request with id ${requestId} not found`);

    request.status = 'REJECTED';
    request.reviewedBy = admin;
    request.reviewedAt = new Date();
    const saved = await this.profileChangeRepo.save(request);

    if (this.notificationsService) {
      try {
        await this.notificationsService.createForUser(
          request.user.id,
          NotificationType.PROFILE_CHANGE_REJECTED,
          'Profile Update Rejected',
          'Your profile change request has been rejected',
          request.id,
          'profile-change-request',
        );
      } catch {
        // best-effort
      }
    }

    return saved;
  }

  async uploadProfilePicture(userId: string, file: Express.Multer.File): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    user.profilePicture = `profile-pictures/${file.filename}`;
    return this.usersRepo.save(user);
  }

  async createUserByAdmin(dto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      contactNumber: dto.contactNumber,
      middleName: dto.middleName,
      invitedBy: dto.invitedBy,
      facebookLink: dto.facebookLink,
      firstDateAttendedChurch: dto.firstDateAttendedChurch,
      dateBaptized: dto.dateBaptized,
      accountStatus: AccountStatus.APPROVED,
    });
    const saved = await this.usersRepo.save(user);

    if (dto.roles?.length) {
      const userWithRoles = await this.usersRepo.findOne({
        where: { id: saved.id },
        relations: ['roles'],
      });
      if (userWithRoles) {
        for (const roleName of dto.roles) {
          const role = await this.rolesRepo.findOne({ where: { name: roleName as RoleName } });
          if (role) {
            userWithRoles.roles.push(role);
          }
        }
        await this.usersRepo.save(userWithRoles);
        return userWithRoles;
      }
    }

    return saved;
  }

  async removeRole(userId: string, roleName: RoleName): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    const role = await this.rolesRepo.findOne({ where: { name: roleName } });
    if (!role) throw new NotFoundException(`Role ${roleName} not found`);

    user.roles = user.roles.filter(r => r.id !== role.id);
    return this.usersRepo.save(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);
    await this.usersRepo.remove(user);
  }

  async getMemberNames(): Promise<{ name: string }[]> {
    const users = await this.usersRepo.find({
      where: { accountStatus: AccountStatus.APPROVED },
      select: ['firstName', 'lastName'],
    });
    return users.map(u => ({ name: `${u.firstName} ${u.lastName}` }));
  }

  async findByRoles(roleNames: string[]): Promise<User[]> {
    return this.usersRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('role.name IN (:...roleNames)', { roleNames })
      .andWhere('user.accountStatus = :status', { status: AccountStatus.APPROVED })
      .getMany();
  }

  async declineUser(userId: string, reason?: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    user.accountStatus = AccountStatus.DECLINED;
    user.declineReason = reason ?? '';
    const saved = await this.usersRepo.save(user);

    if (this.notificationsService) {
      try {
        await this.notificationsService.createForUser(
          userId,
          NotificationType.USER_DECLINED,
          'Account Declined',
          reason
            ? `Your account has been declined. Reason: ${reason}`
            : 'Your account has been declined.',
          userId,
          'user',
        );
      } catch {
        // best-effort
      }
    }

    return saved;
  }

  async findDeclinedUsers(): Promise<User[]> {
    return this.usersRepo.find({ where: { accountStatus: AccountStatus.DECLINED } });
  }
}
