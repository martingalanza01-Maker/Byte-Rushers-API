import {get} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {UserRepository} from '../repositories/user.repository';
import {SubmissionRepository} from '../repositories/submission.repository';
import {Submission} from '../models';

export class StatsController {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @repository(SubmissionRepository) private submissionRepo: SubmissionRepository,
  ) {}

  @get('/stats/dashboard/staff', {
    responses: {
      '200': {
        description: 'Staff dashboard stats',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                totalResidents: {type: 'number'},
                pending: {type: 'number'},
                completedToday: {type: 'number'},
                activeIssue: {type: 'number'},
                documents: {type: 'number'}
              }
            }
          }
        }
      }
    }
  })
  async staffDashboard() {
    // Count total registered residents (has residentId)
    const residentsCount = await this.userRepo.count({residentId: {neq: null}} as any);
    const totalResidents = residentsCount.count;

    // Get all submissions
    const all: Submission[] = await this.submissionRepo.find();

    const norm = (v?: string) => String(v ?? '').trim().toLowerCase();
    const isDoc = (t?: string) => norm(t) === 'document';
    const isComplaintOrInquiry = (t?: string) => {
      const tt = norm(t);
      return tt === 'complaint' || tt === 'inquiry';
    };

    // Today (Asia/Manila) YYYY-MM-DD
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const manilaNow = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Manila'}));
    const todayStr = fmt.format(manilaNow);
    const dateKey = (iso?: string) => (iso ? fmt.format(new Date(iso)) : '');

    const pending = all.filter((s: Submission) =>
      isDoc(s.submissionType) && norm(s.status) === 'pending'
    ).length;

    const documents = all.filter((s: Submission) =>
      isDoc(s.submissionType) && norm(s.status) === 'completed'
    ).length;

    const completedToday = all.filter((s: Submission) =>
      isDoc(s.submissionType) && norm(s.status) === 'completed' && dateKey(s.dateCompleted) === todayStr
    ).length;

    const activeIssue = all.filter((s: Submission) =>
      isComplaintOrInquiry(s.submissionType) && norm(s.status) === 'active'
    ).length;

    return { totalResidents, pending, completedToday, activeIssue, documents };
  }
}
