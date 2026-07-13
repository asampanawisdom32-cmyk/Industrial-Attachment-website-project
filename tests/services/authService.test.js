const AuthService = require('../../services/authService');
const FirestoreService = require('../../services/firestoreService');
const { auth } = require('../../config/firebase');

jest.mock('../../config/firebase', () => ({
  auth: {
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    verifyIdToken: jest.fn(),
    setCustomUserClaims: jest.fn(),
    createSessionCookie: jest.fn(),
    verifySessionCookie: jest.fn(),
    createCustomToken: jest.fn(),
  },
}));

jest.mock('../../services/firestoreService');
jest.mock('../../models', () => {
  const { User } = jest.requireActual('../../models');
  return { User };
});

// StudentsService is required internally by AuthService when creating student profiles
jest.mock('../../services/studentsService', () => ({
  createStudent: jest.fn(),
}));

describe('AuthService', () => {
  const mockUserRecord = { uid: 'user123' };
  const mockUserData = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'student',
    phoneNumber: '1234567890',
    studentProfile: {
      studentId: 'STU001',
      department: 'Computer Science',
      phone: '1234567890',
      workplace: 'Tech Corp',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('adminExists', () => {
    it('returns true when an admin user exists', async () => {
      FirestoreService.getByField.mockResolvedValue([{ id: 'admin1', role: 'admin' }]);
      const result = await AuthService.adminExists();
      expect(result).toBe(true);
      expect(FirestoreService.getByField).toHaveBeenCalledWith('users', 'role', 'admin', 1);
    });

    it('returns false when no admin exists', async () => {
      FirestoreService.getByField.mockResolvedValue([]);
      const result = await AuthService.adminExists();
      expect(result).toBe(false);
    });

    it('throws on error', async () => {
      FirestoreService.getByField.mockRejectedValue(new Error('DB error'));
      await expect(AuthService.adminExists()).rejects.toThrow('Failed to check admin existence');
    });
  });

  describe('getAllSupervisors', () => {
    it('returns school and workplace supervisors', async () => {
      const schoolSup = [{ id: 's1', name: 'Dr. Smith', role: 'school_supervisor' }];
      const workplaceSup = [{ id: 'w1', name: 'Ms. Jones', role: 'workplace_supervisor' }];
      FirestoreService.getByField
        .mockResolvedValueOnce(schoolSup)
        .mockResolvedValueOnce(workplaceSup);

      const result = await AuthService.getAllSupervisors();
      expect(result).toEqual({ schoolSupervisors: schoolSup, workplaceSupervisors: workplaceSup });
      expect(FirestoreService.getByField).toHaveBeenCalledTimes(2);
    });

    it('throws on error', async () => {
      FirestoreService.getByField.mockRejectedValue(new Error('DB error'));
      await expect(AuthService.getAllSupervisors()).rejects.toThrow('Failed to get supervisors');
    });
  });

  describe('registerUser', () => {
    it('registers a new user with student role and creates student profile', async () => {
      auth.createUser.mockResolvedValue(mockUserRecord);
      FirestoreService.createDocument.mockResolvedValue('user123');
      auth.setCustomUserClaims.mockResolvedValue(true);

      const StudentsService = require('../../services/studentsService');
      StudentsService.createStudent.mockResolvedValue({ id: 'stu1' });

      const result = await AuthService.registerUser('john@example.com', 'password123', mockUserData);

      expect(auth.createUser).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        displayName: 'John Doe',
      });
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          email: 'john@example.com',
          name: 'John Doe',
          role: 'student',
        }),
        'user123'
      );
      expect(auth.setCustomUserClaims).toHaveBeenCalledWith('user123', { role: 'student' });
      expect(StudentsService.createStudent).toHaveBeenCalledWith('user123', expect.objectContaining({
        studentId: 'STU001',
        department: 'Computer Science',
      }));
      expect(result).toEqual({
        uid: 'user123',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'student',
      });
    });

    it('registers a non-student user without student profile', async () => {
      const adminData = { name: 'Admin', role: 'admin', phoneNumber: '' };
      auth.createUser.mockResolvedValue({ uid: 'admin123' });
      FirestoreService.createDocument.mockResolvedValue('admin123');
      auth.setCustomUserClaims.mockResolvedValue(true);

      const result = await AuthService.registerUser('admin@example.com', 'password123', adminData);

      expect(result.role).toBe('admin');
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({ role: 'admin' }),
        'admin123'
      );
    });

    it('normalizes email to lowercase', async () => {
      auth.createUser.mockResolvedValue({ uid: 'u1' });
      FirestoreService.createDocument.mockResolvedValue('u1');
      auth.setCustomUserClaims.mockResolvedValue(true);

      await AuthService.registerUser('JOHN@EXAMPLE.COM', 'password123', { name: 'John', role: 'student' });

      expect(auth.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'john@example.com' })
      );
    });

    it('throws a user-friendly message for duplicate email', async () => {
      const error = new Error('Already exists');
      error.code = 'auth/email-already-exists';
      auth.createUser.mockRejectedValue(error);

      await expect(
        AuthService.registerUser('dup@example.com', 'password123', { name: 'Dup' })
      ).rejects.toThrow('An account with this email already exists.');
    });
  });

  describe('getUserByEmail', () => {
    it('returns user when found', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com' };
      FirestoreService.getByField.mockResolvedValue([mockUser]);
      const result = await AuthService.getUserByEmail('TEST@EXAMPLE.COM');
      expect(result).toEqual(mockUser);
      expect(FirestoreService.getByField).toHaveBeenCalledWith('users', 'email', 'test@example.com');
    });

    it('returns null when not found', async () => {
      FirestoreService.getByField.mockResolvedValue([]);
      const result = await AuthService.getUserByEmail('none@example.com');
      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      FirestoreService.getByField.mockRejectedValue(new Error('DB error'));
      await expect(AuthService.getUserByEmail('test@example.com')).rejects.toThrow('Failed to get user');
    });
  });

  describe('getUserByUid', () => {
    it('returns user document', async () => {
      const mockUser = { id: 'u1', uid: 'user123', name: 'John' };
      FirestoreService.getDocument.mockResolvedValue(mockUser);
      const result = await AuthService.getUserByUid('user123');
      expect(result).toEqual(mockUser);
      expect(FirestoreService.getDocument).toHaveBeenCalledWith('users', 'user123');
    });

    it('throws on error', async () => {
      FirestoreService.getDocument.mockRejectedValue(new Error('DB error'));
      await expect(AuthService.getUserByUid('user123')).rejects.toThrow('Failed to get user');
    });
  });

  describe('updateUserProfile', () => {
    it('updates Firestore and Auth for name change', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      auth.updateUser.mockResolvedValue(true);

      const result = await AuthService.updateUserProfile('user123', { name: 'New Name' });

      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith(
        'users', 'user123', expect.objectContaining({ name: 'New Name', updatedAt: expect.any(Date) })
      );
      expect(auth.updateUser).toHaveBeenCalledWith('user123', { displayName: 'New Name' });
    });

    it('only updates Firestore when no auth-related fields change', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);

      const result = await AuthService.updateUserProfile('user123', { phoneNumber: '999' });

      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalled();
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    it('throws on error', async () => {
      FirestoreService.updateDocument.mockRejectedValue(new Error('DB error'));
      await expect(AuthService.updateUserProfile('user123', { name: 'X' })).rejects.toThrow('Failed to update profile');
    });
  });

  describe('deleteUser', () => {
    it('deletes user from Auth and Firestore', async () => {
      auth.deleteUser.mockResolvedValue(true);
      FirestoreService.deleteDocument.mockResolvedValue(true);

      const result = await AuthService.deleteUser('user123');

      expect(result).toBe(true);
      expect(auth.deleteUser).toHaveBeenCalledWith('user123');
      expect(FirestoreService.deleteDocument).toHaveBeenCalledWith('users', 'user123');
    });

    it('throws on error', async () => {
      auth.deleteUser.mockRejectedValue(new Error('Auth error'));
      await expect(AuthService.deleteUser('user123')).rejects.toThrow('Failed to delete user');
    });
  });

  describe('getAllUsers', () => {
    it('returns all users with no role filter', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      FirestoreService.getDocuments.mockResolvedValue(users);
      const result = await AuthService.getAllUsers();
      expect(result).toEqual(users);
      expect(FirestoreService.getDocuments).toHaveBeenCalledWith('users');
    });

    it('filters by role when provided', async () => {
      FirestoreService.getByField.mockResolvedValue([{ id: 'a1', role: 'admin' }]);
      const result = await AuthService.getAllUsers('admin');
      expect(FirestoreService.getByField).toHaveBeenCalledWith('users', 'role', 'admin');
      expect(result).toHaveLength(1);
    });
  });

  describe('verifyIdToken', () => {
    it('returns decoded token on success', async () => {
      const decoded = { uid: 'user123', email: 'test@example.com' };
      auth.verifyIdToken.mockResolvedValue(decoded);
      const result = await AuthService.verifyIdToken('valid-token');
      expect(result).toEqual(decoded);
      expect(auth.verifyIdToken).toHaveBeenCalledWith('valid-token');
    });

    it('throws on invalid token', async () => {
      auth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));
      await expect(AuthService.verifyIdToken('bad-token')).rejects.toThrow('Token verification failed');
    });
  });

  describe('createCustomToken', () => {
    it('creates a custom token', async () => {
      auth.createCustomToken.mockResolvedValue('custom-token-123');
      const result = await AuthService.createCustomToken('user123');
      expect(result).toBe('custom-token-123');
      expect(auth.createCustomToken).toHaveBeenCalledWith('user123');
    });
  });

  describe('setCustomClaims', () => {
    it('sets custom claims for a user', async () => {
      auth.setCustomUserClaims.mockResolvedValue(true);
      const result = await AuthService.setCustomClaims('user123', { role: 'admin' });
      expect(result).toBe(true);
      expect(auth.setCustomUserClaims).toHaveBeenCalledWith('user123', { role: 'admin' });
    });

    it('throws on error', async () => {
      auth.setCustomUserClaims.mockRejectedValue(new Error('Claims error'));
      await expect(AuthService.setCustomClaims('user123', { role: 'admin' })).rejects.toThrow('Failed to set custom claims');
    });
  });
});
