export type MockUser = {
  id: string;
  fullName: string;
  handle: string;
  email: string;
  phone: string;
  createdDate: string;
  lastLogin: string;
  status: 'Active' | 'Suspended';
  avatarUrl: string;
};

export const mockUsers: MockUser[] = [
  {
    id: '1',
    fullName: 'Alex Thompson',
    handle: '@alex_t',
    email: 'alex.thompson@gmail.com',
    phone: '+1 (555) 0123',
    createdDate: 'Oct 12, 2023',
    lastLogin: '2h ago',
    status: 'Active',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBCtBP396Dq-2OaBxUgkQsN6xOxjyNOWyY705gX5G8wX0StvTA7Em0dIEeYDt5LmGW_qVV1WTMD6Gd-7Ek83XR4t5hSNKBxSAUXjRVVW7Lu39d1fozgFyP5OQtEY5zdl6V2tQFwUYxRGyxF7NvKinOhWMl4gmnTT-0lHRckOgVo-AUJyUsK6SiZNmjZiyFPE326W708cy2UgIdygsNhpg8eDqQN7aCZtVM8eqX7WHk27OFHxipZhKwcSsuqacHMxC-3hAyKFvey9K4T',
  },
  {
    id: '2',
    fullName: 'Sarah Chen',
    handle: '@schen_dev',
    email: 'sarah.chen@tech.co',
    phone: '+44 20 7123 4567',
    createdDate: 'Nov 05, 2023',
    lastLogin: '1d ago',
    status: 'Suspended',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCMCJ1VMNiVUAGMbC6EBoTb3st270vVmKEz5EIng3MpxsqB0wWuqo9-MVhd6tUlOrIE9-tLJOXWZfoQC_rDDg8SCM5-9MzTvDUqxZik_n7CkCEmGEYe88RlHYScdRpeH5WJNZvuKuG_vsyMVLP82jMWNYVHo8YTqzDKVKtnpJzn_kK4JmJnjoeuuRMso86T75kpMDUwCF4iju8ztIeWfm4g54SxjRUj3a9EU41EwGyfKkR23_YWpvSVVHzvv-oZPRG5SvRat5GGoA-Y',
  },
];

export function findMockUser(userId: string | undefined): MockUser | undefined {
  if (!userId) {
    return undefined;
  }

  return mockUsers.find((user) => user.id === userId);
}
