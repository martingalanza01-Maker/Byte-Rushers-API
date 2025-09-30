import {get, param, HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {UserRepository} from '../repositories/user.repository';
import {SubmissionRepository} from '../repositories/submission.repository';

type ResidentDash = {
  totalRequests: number;
  pending: number;
  completed: number;
  activeIssues: number;
  issuesResolved: number;
  communityEngagement: number; // percentage 0-100
};

export class StatsController {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @repository(SubmissionRepository) private submissionRepo: SubmissionRepository,
  ) {}

  @get('/stats/dashboard')
  async dashboard() {
    const residents = await this.userRepo.count({type: 'resident'}).then(r => r.count).catch(()=>0);
    const staff = await this.userRepo.count({type: 'staff'}).then(r => r.count).catch(()=>0);
    const documents = await this.submissionRepo.count({submissionType: 'Document', status: 'completed'} as any).then(r => r.count).catch(()=>0);
    const resolved = await this.submissionRepo.count({status: 'resolved'} as any).then(r => r.count).catch(()=>0);
    return { ok: true, residents, documents, resolved, staff };
  }

  /**
   * Resident-specific dashboard numbers.
   * Filtered by the logged-in user's email.
   * You can pass the email as a query param (e.g., /stats/dashboard/resident?email=a@b.com).
   * If your auth layer decorates the request with a user, you could adapt this to read from ctx.
   */
  @get('/stats/dashboard/resident')
  async residentDashboard(
    @param.query.string('email') email?: string,
  ): Promise<ResidentDash> {
    const userEmail = (email || '').trim().toLowerCase();
    if (!userEmail) {
      throw new HttpErrors.BadRequest('email query parameter is required');
    }

    // Load all submissions for this user once; compute stats in memory for robust case-insensitive checks.
    const fields = ['id','email','submissionType','status','createdAt','complaintId','documentReqId'] as any;
    const mine = await this.submissionRepo.find({where: {email: userEmail} as any, fields}).catch(() => [] as any[]);

    const norm = (v?: string) => (v || '').toString().trim().toLowerCase();
    const isDoc = (t?: string) => norm(t) === 'document';
    const isComplaintOrInquiry = (t?: string) => {
      const tt = norm(t);
      return tt === 'complaint' || tt === 'inquiry';
    };

    const totalRequests = mine.length;

    const pending = mine.filter(s => isDoc(s.submissionType) && norm(s.status) === 'pending').length;
    const completed = mine.filter(s => isDoc(s.submissionType) && norm(s.status) === 'completed').length;

    const activeIssues = mine.filter(s => isComplaintOrInquiry(s.submissionType) && norm(s.status) === 'active').length;
    const issuesResolved = mine.filter(s => isComplaintOrInquiry(s.submissionType) && norm(s.status) === 'resolved').length;

    const communityEngagement = totalRequests > 0
      ? Math.round(((completed + issuesResolved) / totalRequests) * 100)
      : 0;

    return { totalRequests, pending, completed, activeIssues, issuesResolved, communityEngagement };
  }
}
