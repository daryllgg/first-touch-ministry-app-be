import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { RoleName } from './entities/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
  ) {}

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
    if (!user || !role) throw new Error('User or role not found');
    user.roles.push(role);
    return this.usersRepo.save(user);
  }

  async approveUser(userId: string): Promise<User> {
    const user = await this.usersRepo.findOneOrFail({ where: { id: userId } });
    user.isApproved = true;
    return this.usersRepo.save(user);
  }

  async findPendingUsers(): Promise<User[]> {
    return this.usersRepo.find({ where: { isApproved: false } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }
}
