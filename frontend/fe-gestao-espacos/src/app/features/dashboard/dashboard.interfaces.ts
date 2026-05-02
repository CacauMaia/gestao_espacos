import { UserRole } from '../../core/auth/auth.interfaces';

export type SpaceType = 'classroom' | 'laboratory' | 'study';
export type CheckoutReason = 'manual' | 'auto_expired' | 'forced';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active?: boolean;
  createdAt?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface AttendanceNotification {
  attendanceId: string;
  type: 'leaving_soon' | 'overdue';
  spaceId: string;
  spaceName: string;
  spaceType: string;
  entryAt: string;
  expectedExitAt: string;
  exceededMinutes: number;
  message: string;
}

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  createdAt?: string;
}

export interface CreateSpacePayload {
  name: string;
  type: SpaceType;
  capacity: number;
}

export interface UpdateSpacePayload {
  name?: string;
  type?: SpaceType;
  capacity?: number;
}

export interface Attendance {
  id: string;
  userId: string;
  spaceId: string;
  entryAt: string;
  expectedExitAt?: string;
  exitAt: string | null;
  checkoutReason: CheckoutReason | null;
  closedByUserId?: string | null;
  checkoutNote?: string | null;
  user?: User;
  space?: Space;
  closedByUser?: User | null;
}

export interface Occupancy {
  spaceId: string;
  name: string;
  type: SpaceType;
  capacity: number;
  currentOccupancy: number;
  availableSlots: number;
  occupancyPercentage: number;
}
