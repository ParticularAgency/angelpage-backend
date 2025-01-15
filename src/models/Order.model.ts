import mongoose, { Schema, Document, Types } from "mongoose";

interface ShippingAddress {
	name: string;
	address: string;
	city: string;
	state?: string;
	country: string;
	postcode: string;
	email?: string;
}

interface PaymentMethod {
	nameAccountHolder: string;
	accountNumber: string;
	expiryDate: string;
	cvvNumber: string;
	billingAddress: {
		name: string;
		address: string;
		city: string;
		country: string;
		postCode: string;
	};
	useShippingAsBilling: boolean;
}

interface Dimensions {
	height: string;
	width: string;
	length: string;
}

interface OrderedProduct {
	productId: Types.ObjectId | null;
	name: string;
	price: number;
	charityProfit: number;
	adminFee: number;
	weight: string; // Updated to align with the product schema
	dimensions: Dimensions; // Updated to include dimensions as an object
	additionalInfo?: string;
	category?: string;
	subcategory?: string;
	condition?: string;
	brand?: string;
	material?: string;
	color?: string;
	size?: string;
	images?: string[]; // Array to store image URLs
	seller?: Types.ObjectId | { firstName: string; lastName: string };
	charity: Types.ObjectId | { charityName: string };
	quantity: number;
	totalProductCost: number;
}
interface TrackingEvent {
	occurred_at: Date;
	carrier_occurred_at?: Date;
	description: string;
	city_locality?: string;
	state_province?: string;
	postal_code?: string;
	country_code?: string;
	company_name?: string;
	signer?: string;
	event_code?: string;
	carrier_detail_code?: string;
	status_code?: string;
	status_detail_code?: string;
	status_description?: string;
	status_detail_description?: string;
	carrier_status_code?: string;
	carrier_status_description?: string;
	latitude?: number;
	longitude?: number;
}

const TrackingEventSchema = new Schema({
	occurred_at: { type: Date, required: true },
	carrier_occurred_at: { type: Date, required: false },
	description: { type: String, required: true },
	city_locality: { type: String },
	state_province: { type: String },
	postal_code: { type: String },
	country_code: { type: String },
	company_name: { type: String },
	signer: { type: String },
	event_code: { type: String },
	carrier_detail_code: { type: String },
	status_code: { type: String },
	status_detail_code: { type: String },
	status_description: { type: String },
	status_detail_description: { type: String },
	carrier_status_code: { type: String },
	carrier_status_description: { type: String },
	latitude: { type: Number },
	longitude: { type: Number },
});
export interface IOrderDocument extends Document {
	buyerId: Types.ObjectId;
	products: OrderedProduct[];
	totalAmount: number;
	grandTotal: number;
	paymentConfirmedAt: Date;
	ItemShippedAt: Date;
	ItemDeliveredAt: Date;
	SalesProceedAt: Date;
	CreateLabelAt: Date;
	paymentStatus: "Pending" | "Paid" | "Failed";
	paymentConfirmed: boolean;
	shippingAddress: ShippingAddress;
	paymentMethod: PaymentMethod;
	shipStationOrderId?: number;
	carrierCode?: string;
	serviceCode?: string;
	packageCode?: string;
	totalWeight?: string;
	trackingStatus?: string;
	orderNumber?: string;

	status_code?: string;
	tracking_url?: string;
	status_detail_code?: string;
	status_description?: string;
	carrier_status_code?: string;
	carrier_status_description?: string;
	estimated_delivery_date?: string;
	actual_delivery_date?: string;
	trackingEvents: TrackingEvent[];
	combinedDimensions?: Dimensions;
	trackingNumber?: string;
	labelId?: string;
	labelUrl?: string;
	label_download?: string;
	labelData?: string;
	shipmentId?: string;
	shipmentCost?: number;
	insuranceCost?: number;
	packageInfo?: object;
	pickupInfo?: object;
	orderStatus:
		| "OrderPlaced"
		| "OrderConfirmed"
		| "LabelCreated"
		| "LabelFailed"
		| "awaiting_shipment"
		| "ItemShipped"
		| "PickedUp"
		| "InTransit"
		| "OutForDelivery"
		| "Delivered"
		| "SalesProceeds"
		| "ShipStationOrderFailed"
		| "OrderCancel";
	status:
		| "OrderPlaced"
		| "OrderConfirmed"
		| "LabelCreated"
		| "LabelFailed"
		| "awaiting_shipment"
		| "ItemShipped"
		| "PickedUp"
		| "InTransit"
		| "OutForDelivery"
		| "Delivered"
		| "SalesProceeds"
		| "ShipStationOrderFailed"
		| "OrderCancel";
	tags?: string[];
}

const DimensionsSchema = new Schema<Dimensions>({
	height: { type: String, required: true },
	width: { type: String, required: true },
	length: { type: String, required: true },
});

const OrderedProductSchema = new Schema<OrderedProduct>({
	productId: { type: Schema.Types.ObjectId, ref: "Product", required: false },
	name: { type: String, required: true },
	price: { type: Number, required: true },
	charityProfit: { type: Number, required: true },
	adminFee: { type: Number, required: true },
	weight: { type: String, required: false }, // Updated to string
	dimensions: { type: DimensionsSchema, required: false }, // Nested schema for dimensions
	additionalInfo: { type: String },
	category: { type: String },
	subcategory: { type: String },
	condition: { type: String },
	brand: { type: String },
	material: { type: String },
	color: { type: String },
	size: { type: String },
	images: { type: [String], default: [] }, // Array of image URLs
	seller: { type: Schema.Types.ObjectId, ref: "User", required: false },
	charity: { type: Schema.Types.ObjectId, ref: "Charity", required: true },
	quantity: { type: Number, required: true, min: 1 },
	totalProductCost: { type: Number, required: true },
});

const ShippingAddressSchema = new Schema<ShippingAddress>({
	name: { type: String, required: true },
	address: { type: String, required: true },
	city: { type: String, required: true },
	state: { type: String },
	country: { type: String, required: true },
	postcode: { type: String, required: true },
	email: { type: String },
});

const PaymentMethodSchema = new Schema<PaymentMethod>({
	nameAccountHolder: { type: String, required: true },
	accountNumber: { type: String, required: true },
	expiryDate: { type: String, required: true },
	cvvNumber: { type: String, required: true },
	billingAddress: {
		name: {
			type: String,
			required: function (this: PaymentMethod) {
				return !this.useShippingAsBilling;
			},
		},
		address: {
			type: String,
			required: function (this: PaymentMethod) {
				return !this.useShippingAsBilling;
			},
		},
		city: {
			type: String,
			required: function (this: PaymentMethod) {
				return !this.useShippingAsBilling;
			},
		},
		country: {
			type: String,
			required: function (this: PaymentMethod) {
				return !this.useShippingAsBilling;
			},
		},
		postCode: {
			type: String,
			required: function (this: PaymentMethod) {
				return !this.useShippingAsBilling;
			},
		},
	},
	useShippingAsBilling: { type: Boolean, default: false },
});

const OrderSchema = new Schema<IOrderDocument>(
	{
		buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
		products: { type: [OrderedProductSchema], required: true },
		totalAmount: { type: Number, required: true, min: 0 },
		grandTotal: { type: Number, required: true, min: 0 },
		paymentStatus: {
			type: String,
			enum: ["Pending", "Paid", "Failed"],
			default: "Pending",
		},
		paymentConfirmed: { type: Boolean, default: false },
		shippingAddress: { type: ShippingAddressSchema, required: true },
		paymentMethod: { type: PaymentMethodSchema, required: true },
		paymentConfirmedAt: { type: Date, default: null },
		ItemShippedAt: { type: Date, default: null },
		CreateLabelAt: { type: Date, default: null },
		trackingStatus: { type: String },
		ItemDeliveredAt: { type: Date, default: null },
		SalesProceedAt: { type: Date, default: null },
		carrierCode: { type: String },
		serviceCode: { type: String },
		packageCode: { type: String },
		orderNumber: { type: String },
		status_code: { type: String },
		tracking_url: { type: String },
		status_detail_code: { type: String },
		status_description: { type: String },
		carrier_status_code: { type: String },
		trackingEvents: { type: [TrackingEventSchema], default: [] },
		carrier_status_description: { type: String },
		estimated_delivery_date: { type: String },
		actual_delivery_date: { type: String },
		totalWeight: { type: Number, required: false }, // Updated to ensure weight is stored as a number
		combinedDimensions: {
			length: { type: Number, required: false },
			width: { type: Number, required: false },
			height: { type: Number, required: false },
		},
		trackingNumber: { type: String },
		labelId: { type: String },
		labelUrl: { type: String },
		label_download: { type: String },
		labelData: { type: String },
		shipStationOrderId: { type: Number },
		shipmentId: { type: String },
		shipmentCost: { type: Number },
		insuranceCost: { type: Number },
		packageInfo: { type: Object },
		pickupInfo: { type: Object },
		orderStatus: {
			type: String,
			enum: [
				"OrderPlaced",
				"OrderConfirmed",
				"LabelCreated",
				"awaiting_shipment",
				"ItemShipped",
				"PickedUp",
				"InTransit",
				"OutForDelivery",
				"Delivered",
				"SalesProceeds",
				"LabelFailed",
				"ShipStationOrderFailed",
				"OrderCancel",
			],
			default: "OrderPlaced",
		},
		status: {
			type: String,
			enum: [
				"OrderPlaced",
				"OrderConfirmed",
				"LabelCreated",
				"awaiting_shipment",
				"ItemShipped",
				"PickedUp",
				"InTransit",
				"OutForDelivery",
				"Delivered",
				"SalesProceeds",
				"LabelFailed",
				"ShipStationOrderFailed",
				"OrderCancel",
			],
			default: "OrderPlaced",
		},
		tags: { type: [String], default: [] },
	},
	{ timestamps: true },
);

export default mongoose.model<IOrderDocument>("Order", OrderSchema);
