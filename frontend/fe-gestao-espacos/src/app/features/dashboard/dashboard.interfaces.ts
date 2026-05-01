import { UserRole } from '../../core/auth/auth.interfaces';

export type SpaceType = 'classroom' | 'laboratory' | 'study';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

export interface Attendance {
  id: string;
  userId: string;
  spaceId: string;
  entryAt: string;
  expectedExitAt?: string;
  exitAt: string | null;
  user?: User;
  space?: Space;
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
