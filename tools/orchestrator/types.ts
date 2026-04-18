export const taskStatusValues = [
  'backlog',
  'ready',
  'in-progress',
  'in-review',
  'approved',
  'done',
  'changes-requested',
  'blocked',
  'awaiting-review',
] as const;

export type TaskStatus = (typeof taskStatusValues)[number];

export type AcceptanceCriterion = {
  criterion: string;
  verify: string;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  wave: number;
  depends_on: string[];
  parallel_safe_with: string[];
  owner_dev: string | null;
  owner_reviewer: string | null;
  branch: string;
  acceptance: AcceptanceCriterion[];
  deliverables: string[];
  filePath: string;
  notes?: string;
};
