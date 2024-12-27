import axios from "axios";

const API_KEY = process.env.SHIPSTATION_API_KEY;
const API_SECRET = process.env.SHIPSTATION_API_SECRET;
const API_BASE_URL = "https://ssapi.shipstation.com/";

const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");

// const authToken = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");

// axios
// 	.get("https://ssapi.shipstation.com/carriers", {
// 		headers: { Authorization: `Basic ${authToken}` },
// 	})
// 	.then(response => {
// 		console.log("Carriers:", response.data);
// 	})
// 	.catch(error => {
// 		console.error("Error:", error.response?.data || error.message);
// 	});

export const shipStationClient = {
	async getCarriers() {
		const response = await axios.get(`${API_BASE_URL}/carrier`, {
			headers: { Authorization: `Basic ${auth}` },
		});
      console.log(response);

		return response.data;
	},

	async createLabel(data: any) {
		const response = await axios.post(
			`${API_BASE_URL}/shipments/createlabel`,
			data,
			{
				headers: { Authorization: `Basic ${auth}` },
			},
		);
		return response.data;
	},

	async trackPackage(trackingNumber: string) {
		const response = await axios.get(`${API_BASE_URL}/track`, {
			params: { trackingNumber },
			headers: { Authorization: `Basic ${auth}` },
		});
		return response.data;
	},

	async schedulePickup(data: any) {
		const response = await axios.post(`${API_BASE_URL}/pickup`, data, {
			headers: { Authorization: `Basic ${auth}` },
		});
		return response.data;
	},
};
