import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { Delivery } from '../models/Delivery';
import { Activity } from '../models/Activity';
import { getKolkataDateInfo } from '../utils/timeZone';

/**
 * GET /api/admin/delivery-persons
 * Returns operational metrics for all active delivery personnel.
 * Strictly restricted to ADMIN role.
 */
export const getDeliveryPersonsList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getKolkataDateInfo().deliveryDate;

    // Fetch all delivery personnel
    const agents = await User.find({ role: 'DELIVERY_PERSON' }).sort({ createdAt: -1 });

    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const agentId = agent._id;

        const [totalDeliveries, totalSlips, todayDeliveries, todaySlips, lastRecord] =
          await Promise.all([
            Delivery.countDocuments({ deliveryPersonId: agentId }),
            Delivery.countDocuments({ deliveryPersonId: agentId, slipFileId: { $ne: null } }),
            Delivery.countDocuments({ deliveryPersonId: agentId, deliveryDate: today }),
            Delivery.countDocuments({
              deliveryPersonId: agentId,
              deliveryDate: today,
              slipFileId: { $ne: null },
            }),
            Delivery.findOne({ deliveryPersonId: agentId }).sort({ uploadedAt: -1 }),
          ]);

        return {
          id: agent._id.toString(),
          name: agent.name,
          email: agent.email,
          role: agent.role,
          phone: agent.phone || '+91 9820022334',
          status: agent.status || 'ACTIVE',
          totalDeliveries,
          totalSlips,
          todayDeliveries,
          todaySlips,
          lastDeliveryAt: lastRecord ? lastRecord.uploadedAt : null,
          createdAt: agent.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      today,
      totalAgents: agentsWithStats.length,
      agents: agentsWithStats,
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching delivery persons:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery personnel list',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/deliveries
 * Returns all retained delivery records with recipient info, agents, and GridFS slip references.
 * Strictly restricted to ADMIN role.
 */
export const getAllRetainedDeliveries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, search } = req.query;

    const query: Record<string, any> = {};

    if (date && typeof date === 'string' && date.trim()) {
      query.deliveryDate = date.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ receiptNo: regex }, { recipientName: regex }];
    }

    const records = await Delivery.find(query)
      .populate('deliveryPersonId', 'name email phone')
      .sort({ uploadedAt: -1 });

    const formattedRecords = records.map((r) => {
      const agent = r.deliveryPersonId as any;
      return {
        id: r._id.toString(),
        receiptNo: r.receiptNo,
        recipientName: r.recipientName || 'Walk-in / Standard Delivery',
        deliveryPersonId: agent?._id?.toString() || (r.deliveryPersonId ? r.deliveryPersonId.toString() : 'N/A'),
        deliveryPersonName: agent?.name || 'Bhushan Lokhande (DP-01)',
        deliveryPersonEmail: agent?.email || 'delivery@pizzadeliver.com',
        deliveryDate: r.deliveryDate,
        uploadedAt: r.uploadedAt,
        status: r.status,
        slipFileId: r.slipFileId ? r.slipFileId.toString() : null,
        slipImageUrl: r.slipFileId ? `/api/delivery/slip/${r.slipFileId.toString()}` : null,
      };
    });

    return res.status(200).json({
      success: true,
      totalRecords: formattedRecords.length,
      deliveries: formattedRecords,
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching retained deliveries:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch retained deliveries',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/metrics
 * Returns comprehensive aggregate stats for the admin overview.
 */
export const getAdminMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getKolkataDateInfo().deliveryDate;

    const [totalDeliveries, totalSlips, todayDeliveries, todaySlips, activeAgentsCount] =
      await Promise.all([
        Delivery.countDocuments(),
        Delivery.countDocuments({ slipFileId: { $ne: null } }),
        Delivery.countDocuments({ deliveryDate: today }),
        Delivery.countDocuments({ deliveryDate: today, slipFileId: { $ne: null } }),
        User.countDocuments({ role: 'DELIVERY_PERSON', status: 'ACTIVE' }),
      ]);

    return res.status(200).json({
      success: true,
      today,
      metrics: {
        totalDeliveries,
        totalSlips,
        todayDeliveries,
        todaySlips,
        activeAgentsCount,
      },
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching admin metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate admin metrics',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/activities
 * Returns recent authentication and system activities (Login, Logout, Signup).
 * Restricted to ADMIN role.
 */
export const getActivities = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      total: activities.length,
      activities: activities.map((a: any) => ({
        id: a._id.toString(),
        action: a.action,
        userName: a.userName,
        userRole: a.userRole,
        description: a.description,
        timestamp: a.timestamp,
        ip: a.ip,
      })),
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching activities:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity log',
      error: error.message,
    });
  }
};

export default {
  getDeliveryPersonsList,
  getAllRetainedDeliveries,
  getAdminMetrics,
  getActivities,
};
