const DashboardService = require('../services/dashboardService');
const AuthService = require('../services/authService');

class DashboardController {
  static async loadUser(req) {
    return AuthService.getUserByUid(req.user.uid);
  }

  static async getSummary(req, res) {
    try {
      const user = await DashboardController.loadUser(req);
      if (!user) {
        return res.status(404).json({ error: 'User profile not found' });
      }
      const summary = await DashboardService.getSummary(user);
      return res.json({ summary });
    } catch (error) {
      console.error('Dashboard summary error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load dashboard' });
    }
  }

  static async getStudentsPage(req, res) {
    try {
      const user = await DashboardController.loadUser(req);
      if (!user) return res.status(404).json({ error: 'User profile not found' });
      const data = await DashboardService.getStudentsPageData(user);
      return res.json(data);
    } catch (error) {
      console.error('Students page error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load students' });
    }
  }

  static async getReportsPage(req, res) {
    try {
      const user = await DashboardController.loadUser(req);
      if (!user) return res.status(404).json({ error: 'User profile not found' });
      const data = await DashboardService.getReportsPageData(user);
      return res.json(data);
    } catch (error) {
      console.error('Reports page error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load reports' });
    }
  }

  static async getAnalytics(req, res) {
    try {
      const analytics = await DashboardService.getAnalyticsData();
      return res.json({ analytics });
    } catch (error) {
      console.error('Analytics error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load analytics' });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await DashboardController.loadUser(req);
      if (!user) return res.status(404).json({ error: 'User profile not found' });
      const profile = await DashboardService.getProfileData(user);
      return res.json({ profile });
    } catch (error) {
      console.error('Profile page error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load profile' });
    }
  }

  static async getStudentProgress(req, res) {
    try {
      const { studentId } = req.params;
      const detail = await DashboardService.getStudentProgressDetail(studentId);
      if (!detail) return res.status(404).json({ error: 'Student not found' });
      return res.json({ student: detail });
    } catch (error) {
      console.error('Student progress error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load progress' });
    }
  }
}

module.exports = DashboardController;
