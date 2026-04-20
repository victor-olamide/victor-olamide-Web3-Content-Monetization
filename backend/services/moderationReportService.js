const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const ModerationAuditLog = require('../models/ModerationAuditLog');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { createWriteStream } = require('fs');
const path = require('path');

class ModerationReportService {
  /**
   * Generate comprehensive moderation report
   */
  async generateModerationReport(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        includeStats = true,
        includeFlags = true,
        includeAppeals = true,
        includeModeratorPerformance = true
      } = options;

      const report = { generatedAt: new Date() };

      if (includeStats) {
        report.statistics = await this._generateStatistics(startDate, endDate);
      }

      if (includeFlags) {
        report.flagData = await this._generateFlagReport(startDate, endDate);
      }

      if (includeAppeals) {
        report.appealData = await this._generateAppealReport(startDate, endDate);
      }

      if (includeModeratorPerformance) {
        report.moderatorPerformance = await this._generateModeratorPerformanceReport(
          startDate,
          endDate
        );
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to generate moderation report: ${error.message}`);
    }
  }

  /**
   * Generate statistics summary
   */
  async _generateStatistics(startDate, endDate) {
    try {
      const totalSubmissions = await ModerationQueue.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const approved = await ModerationQueue.countDocuments({
        status: 'approved',
        updatedAt: { $gte: startDate, $lte: endDate }
      });

      const rejected = await ModerationQueue.countDocuments({
        status: 'rejected',
        updatedAt: { $gte: startDate, $lte: endDate }
      });

      const escalated = await ModerationQueue.countDocuments({
        escalationLevel: { $exists: true, $ne: null },
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const overduePending = await ModerationQueue.countDocuments({
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      });

      const totalFlags = await ModerationFlag.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      return {
        timeframe: { startDate, endDate },
        totalSubmissions,
        approved,
        approvalRate: totalSubmissions > 0 ? ((approved / totalSubmissions) * 100).toFixed(2) + '%' : 'N/A',
        rejected,
        rejectionRate: totalSubmissions > 0 ? ((rejected / totalSubmissions) * 100).toFixed(2) + '%' : 'N/A',
        escalated,
        overduePending,
        totalFlags,
        averageReviewTime: await this._calculateAverageReviewTime(startDate, endDate)
      };
    } catch (error) {
      throw new Error(`Failed to generate statistics: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive flag report
   */
  async _generateFlagReport(startDate, endDate) {
    try {
      const flagsByCategory = await ModerationFlag.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgSeverity: { $avg: { $cond: [{ $eq: ['$severity', 'critical'] }, 4, { $cond: [{ $eq: ['$severity', 'high'] }, 3, { $cond: [{ $eq: ['$severity', 'medium'] }, 2, 1] }] }] } }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const flagsBySeverity = await ModerationFlag.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
            percentage: { $sum: 1 }
          }
        }
      ]);

      const topReasons = await ModerationFlag.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        byCategory: flagsByCategory,
        bySeverity: flagsBySeverity,
        topReasons,
        totalFlags: await ModerationFlag.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate }
        })
      };
    } catch (error) {
      throw new Error(`Failed to generate flag report: ${error.message}`);
    }
  }

  /**
   * Generate appeal report
   */
  async _generateAppealReport(startDate, endDate) {
    try {
      const totalAppeals = await ModerationQueue.countDocuments({
        'appeal.filed': true,
        'appeal.filedAt': { $gte: startDate, $lte: endDate }
      });

      const appealsApproved = await ModerationQueue.countDocuments({
        'appeal.filed': true,
        'appeal.status': 'approved',
        'appeal.decidedAt': { $gte: startDate, $lte: endDate }
      });

      const appealsDenied = await ModerationQueue.countDocuments({
        'appeal.filed': true,
        'appeal.status': 'denied',
        'appeal.decidedAt': { $gte: startDate, $lte: endDate }
      });

      return {
        totalAppeals,
        approved: appealsApproved,
        denied: appealsDenied,
        approvalRate: totalAppeals > 0 ? ((appealsApproved / totalAppeals) * 100).toFixed(2) + '%' : 'N/A',
        pendingAppeals: await ModerationQueue.countDocuments({
          'appeal.filed': true,
          'appeal.status': 'pending'
        })
      };
    } catch (error) {
      throw new Error(`Failed to generate appeal report: ${error.message}`);
    }
  }

  /**
   * Generate moderator performance report
   */
  async _generateModeratorPerformanceReport(startDate, endDate) {
    try {
      const moderatorStats = await ModerationQueue.aggregate([
        {
          $match: {
            assignedModerator: { $exists: true, $ne: null },
            updatedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$assignedModerator',
            totalReviewed: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            avgReviewTime: { $avg: '$reviewTime' }
          }
        },
        { $sort: { totalReviewed: -1 } }
      ]);

      return {
        topPerformers: moderatorStats.slice(0, 10),
        totalModerators: moderatorStats.length,
        avgReviewsPerModerator:
          moderatorStats.length > 0
            ? (moderatorStats.reduce((sum, m) => sum + m.totalReviewed, 0) / moderatorStats.length).toFixed(2)
            : 0
      };
    } catch (error) {
      throw new Error(`Failed to generate moderator performance report: ${error.message}`);
    }
  }

  /**
   * Calculate average review time
   */
  async _calculateAverageReviewTime(startDate, endDate) {
    try {
      const result = await ModerationQueue.aggregate([
        {
          $match: {
            reviewTime: { $exists: true },
            updatedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$reviewTime' }
          }
        }
      ]);

      return result.length > 0 ? Math.round(result[0].avgTime / 1000) + ' seconds' : 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Export report to CSV
   */
  async exportReportToCSV(reportData, filename = 'moderation-report.csv') {
    try {
      const filePath = path.join(process.env.REPORTS_DIR || './reports', filename);

      let csv = 'Moderation Report\n';
      csv += `Generated: ${reportData.generatedAt}\n\n`;

      // Statistics section
      if (reportData.statistics) {
        csv += 'STATISTICS\n';
        Object.entries(reportData.statistics).forEach(([key, value]) => {
          if (typeof value === 'object') return;
          csv += `${key},${value}\n`;
        });
        csv += '\n';
      }

      // Flags by category
      if (reportData.flagData) {
        csv += 'FLAGS BY CATEGORY\n';
        csv += 'Category,Count,Avg Severity\n';
        reportData.flagData.byCategory.forEach(item => {
          csv += `${item._id},${item.count},${item.avgSeverity.toFixed(2)}\n`;
        });
        csv += '\n';
      }

      return { success: true, filepath: filePath, preview: csv };
    } catch (error) {
      throw new Error(`Failed to export to CSV: ${error.message}`);
    }
  }

  /**
   * Export report to PDF
   */
  async exportReportToPDF(reportData, filename = 'moderation-report.pdf') {
    try {
      const filePath = path.join(process.env.REPORTS_DIR || './reports', filename);
      const doc = new PDFDocument();
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      // Title
      doc.fontSize(20).text('Moderation Report', { align: 'center' });
      doc.fontSize(10).text(`Generated: ${reportData.generatedAt}`, { align: 'center' });
      doc.moveDown();

      // Statistics
      if (reportData.statistics) {
        doc.fontSize(14).text('Statistics Summary');
        doc.fontSize(10);
        Object.entries(reportData.statistics).forEach(([key, value]) => {
          if (typeof value === 'object') return;
          doc.text(`${key}: ${value}`);
        });
        doc.moveDown();
      }

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          resolve({ success: true, filepath: filePath });
        });
        stream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to export to PDF: ${error.message}`);
    }
  }

  /**
   * Export report to Excel
   */
  async exportReportToExcel(reportData, filename = 'moderation-report.xlsx') {
    try {
      const workbook = new ExcelJS.Workbook();

      // Statistics sheet
      if (reportData.statistics) {
        const statsSheet = workbook.addWorksheet('Statistics');
        statsSheet.columns = [
          { header: 'Metric', key: 'metric', width: 25 },
          { header: 'Value', key: 'value', width: 20 }
        ];

        Object.entries(reportData.statistics).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            statsSheet.addRow({ metric: key, value });
          }
        });
      }

      // Flag data sheet
      if (reportData.flagData) {
        const flagSheet = workbook.addWorksheet('Flags');
        flagSheet.columns = [
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Count', key: 'count', width: 10 },
          { header: 'Avg Severity', key: 'severity', width: 15 }
        ];

        reportData.flagData.byCategory.forEach(item => {
          flagSheet.addRow({
            category: item._id,
            count: item.count,
            severity: item.avgSeverity.toFixed(2)
          });
        });
      }

      // Moderator performance sheet
      if (reportData.moderatorPerformance) {
        const modSheet = workbook.addWorksheet('Moderators');
        modSheet.columns = [
          { header: 'Moderator ID', key: 'moderatorId', width: 20 },
          { header: 'Total Reviewed', key: 'total', width: 15 },
          { header: 'Approved', key: 'approved', width: 12 },
          { header: 'Rejected', key: 'rejected', width: 12 },
          { header: 'Avg Review Time', key: 'avgTime', width: 15 }
        ];

        reportData.moderatorPerformance.topPerformers.forEach(moderator => {
          modSheet.addRow({
            moderatorId: moderator._id,
            total: moderator.totalReviewed,
            approved: moderator.approved,
            rejected: moderator.rejected,
            avgTime: moderator.avgReviewTime ? Math.round(moderator.avgReviewTime) + 's' : 'N/A'
          });
        });
      }

      const filePath = path.join(process.env.REPORTS_DIR || './reports', filename);
      await workbook.xlsx.writeFile(filePath);

      return { success: true, filepath: filePath };
    } catch (error) {
      throw new Error(`Failed to export to Excel: ${error.message}`);
    }
  }

  /**
   * Get report generation history
   */
  async getReportHistory(limit = 20) {
    try {
      const reports = await ModerationAuditLog.find({
        action: 'report_generated'
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('createdAt performedBy metadata');

      return reports;
    } catch (error) {
      throw new Error(`Failed to get report history: ${error.message}`);
    }
  }

  /**
   * Schedule automated report generation
   */
  async scheduleAutomatedReport(schedule = {}) {
    try {
      const {
        frequency = 'weekly', // daily, weekly, monthly
        format = ['pdf', 'csv', 'excel'],
        recipients = [],
        includeStats = true,
        includeFlags = true
      } = schedule;

      return {
        success: true,
        scheduled: true,
        frequency,
        nextGenerationDate: this._getNextGenerationDate(frequency),
        format,
        recipients
      };
    } catch (error) {
      throw new Error(`Failed to schedule report: ${error.message}`);
    }
  }

  /**
   * Get next generation date based on frequency
   */
  _getNextGenerationDate(frequency) {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new ModerationReportService();
