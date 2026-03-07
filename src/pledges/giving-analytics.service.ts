import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PledgePayment } from './entities/pledge-payment.entity';
import { Pledge } from './entities/pledge.entity';
import { GivingProgram } from './entities/giving-program.entity';
import { ProgramType } from './entities/program-type.enum';

@Injectable()
export class GivingAnalyticsService {
  constructor(
    @InjectRepository(PledgePayment)
    private paymentRepo: Repository<PledgePayment>,
    @InjectRepository(Pledge)
    private pledgeRepo: Repository<Pledge>,
    @InjectRepository(GivingProgram)
    private programRepo: Repository<GivingProgram>,
  ) {}

  async getSummary(year?: number): Promise<any> {
    const targetYear = year || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    // Total collected per program type
    const totals = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.pledge', 'pledge')
      .leftJoin('pledge.program', 'program')
      .select('program.type', 'programType')
      .addSelect('program.name', 'programName')
      .addSelect('program.id', 'programId')
      .addSelect('SUM(payment.amount)', 'total')
      .addSelect('COUNT(DISTINCT pledge.id)', 'pledgeeCount')
      .where('payment.date >= :startDate', { startDate })
      .andWhere('payment.date <= :endDate', { endDate })
      .groupBy('program.id')
      .addGroupBy('program.type')
      .addGroupBy('program.name')
      .getRawMany();

    const grandTotal = totals.reduce((sum: number, t: any) => sum + parseFloat(t.total || '0'), 0);

    return { year: targetYear, programs: totals, grandTotal };
  }

  async getMonthlyTrends(year?: number): Promise<any[]> {
    const targetYear = year || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const trends = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.pledge', 'pledge')
      .leftJoin('pledge.program', 'program')
      .select("TO_CHAR(payment.date::date, 'YYYY-MM')", 'month')
      .addSelect('program.type', 'programType')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.date >= :startDate', { startDate })
      .andWhere('payment.date <= :endDate', { endDate })
      .groupBy("TO_CHAR(payment.date::date, 'YYYY-MM')")
      .addGroupBy('program.type')
      .orderBy('month', 'ASC')
      .getRawMany();

    return trends;
  }

  async getCompliance(programId: string): Promise<any> {
    const program = await this.programRepo.findOne({ where: { id: programId } });
    if (!program) return { pledgees: [] };

    const pledges = await this.pledgeRepo
      .createQueryBuilder('pledge')
      .leftJoinAndSelect('pledge.user', 'user')
      .leftJoinAndSelect('pledge.payments', 'payments')
      .where('pledge.program.id = :programId', { programId })
      .orderBy('user.lastName', 'ASC')
      .getMany();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const pledgees = pledges.map((pledge) => {
      const totalPaid = pledge.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const monthsPaid = pledge.payments.length;
      const totalMonths = pledge.totalMonths || 10;

      // Calculate months due: from startMonth to current month
      let monthsDue = 0;
      if (pledge.startMonth) {
        const start = new Date(pledge.startMonth + '-01');
        const end = new Date(currentMonth + '-01');
        monthsDue = Math.max(0,
          (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
        );
        monthsDue = Math.min(monthsDue, totalMonths);
      }

      const amountDue = monthsDue * Number(pledge.pledgeAmount);
      let status = 'NEW';
      if (monthsPaid >= totalMonths) status = 'COMPLETE';
      else if (monthsPaid >= monthsDue) status = 'ON_TRACK';
      else if (monthsPaid < monthsDue) status = 'BEHIND';

      return {
        pledgeId: pledge.id,
        userId: pledge.user.id,
        firstName: pledge.user.firstName,
        lastName: pledge.user.lastName,
        pledgeAmount: Number(pledge.pledgeAmount),
        totalMonths,
        monthsPaid,
        monthsDue,
        totalPaid,
        amountDue,
        status,
      };
    });

    const complianceRate = pledgees.length > 0
      ? (pledgees.filter(p => p.status === 'ON_TRACK' || p.status === 'COMPLETE').length / pledgees.length) * 100
      : 0;

    return { program, pledgees, complianceRate: Math.round(complianceRate) };
  }

  async getOverdue(programId: string): Promise<any[]> {
    const compliance = await this.getCompliance(programId);
    return compliance.pledgees.filter((p: any) => p.status === 'BEHIND');
  }
}
