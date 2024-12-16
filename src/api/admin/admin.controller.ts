import { Request, Response } from "express";
import { getDashboardData } from "../../services/admin.service";

export const getAdminDashboard = async (req: Request, res: Response) => {
	try {
		const data = await getDashboardData();
		res.json(data);
	} catch (error) {
		res
			.status(500)
			.json({ message: "Failed to retrieve admin dashboard data" });
	}
};
