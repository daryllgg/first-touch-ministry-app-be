import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { EmailOtp } from './entities/email-otp.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    @InjectRepository(EmailOtp)
    private emailOtpRepository: Repository<EmailOtp>,
  ) {}

  async getOtpStatus(dto: SendOtpDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const otpRecord = await this.emailOtpRepository.findOne({
      where: { email: dto.email },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      return { status: 'none' };
    }

    if (otpRecord.isVerified) {
      return { status: 'verified' };
    }

    return { status: 'pending' };
  }

  async sendOtp(dto: SendOtpDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Delete any previous OTPs for this email
    await this.emailOtpRepository.delete({ email: dto.email });

    // Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.emailOtpRepository.save({
      email: dto.email,
      otp: hashedOtp,
      expiresAt,
    });

    try {
      await this.mailService.sendOtp(dto.email, otp);
    } catch (error) {
      this.logger.error(`Failed to send OTP: ${error.message}`);
      // Clean up the OTP record since email failed
      await this.emailOtpRepository.delete({ email: dto.email });
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again later.',
      );
    }

    return { message: 'OTP sent' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.emailOtpRepository.findOne({
      where: { email: dto.email },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const isValid = await bcrypt.compare(dto.otp, otpRecord.otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    otpRecord.isVerified = true;
    await this.emailOtpRepository.save(otpRecord);

    return { verified: true, email: dto.email };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Check for verified OTP
    const verifiedOtp = await this.emailOtpRepository.findOne({
      where: { email: dto.email, isVerified: true },
    });
    if (!verifiedOtp) {
      throw new BadRequestException('Email not verified');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.usersService.create({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        contactNumber: dto.contactNumber,
        birthday: dto.birthday,
        gender: dto.gender,
        address: dto.address,
      });

      // Cleanup OTP records
      await this.emailOtpRepository.delete({ email: dto.email });

      const { passwordHash: _, ...result } = user;
      return result;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      accessToken: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }
}
