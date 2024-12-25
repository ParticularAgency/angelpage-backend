import mongoose, { Schema, Document, Types } from "mongoose";

// Interfaces
interface ShippingAddress {
	name: string;
	address: string;
	city: string;
	country: string;
	postcode: string;
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

interface OrderedProduct {
	productId: Types.ObjectId | null;
	name: string;
	price: number;
	charityProfit: number;
	adminFee: number;
	seller?: Types.ObjectId | { firstName: string; lastName: string };
	charity: Types.ObjectId | { charityName: string };
	quantity: number;
	totalProductCost: number;
}

export interface IOrderDocument extends Document {
	buyerId: Types.ObjectId;
	products: OrderedProduct[];
	totalAmount: number;
	paymentStatus: "Pending" | "Paid" | "Failed";
	paymentConfirmed: boolean;
	shippingAddress: ShippingAddress;
	paymentMethod: PaymentMethod;
	createdAt: Date;
	carrierCode?: string;
	serviceCode?: string;
	trackingNumber?: string;
	labelId?: string;
	labelUrl?: string;
	packageInfo?: object;
	pickupInfo?: object;
	orderStatus:
		| "OrderConfirmed"
		| "ItemShipped"
		| "InTransit"
		| "Delivered"
		| "SalesProceeds";
	status:
		| "OrderConfirmed"
		| "LabelCreated"
		| "PickedUp"
		| "InTransit"
		| "OutForDelivery"
		| "Delivered"
		| "SalesProceeds";

	tags?: string[];
}

const OrderedProductSchema = new Schema<OrderedProduct>({
	productId: { type: Schema.Types.ObjectId, ref: "Product", required: false },
	name: { type: String, required: true },
	price: { type: Number, required: true },
	charityProfit: { type: Number, required: true },
	adminFee: { type: Number, required: true },
	seller: { type: Schema.Types.ObjectId, ref: "User", required: false },
	charity: { type: Schema.Types.ObjectId, ref: "Charity", required: true },
	quantity: { type: Number, required: true, min: 1 },
	totalProductCost: { type: Number, required: true },
});

const ShippingAddressSchema = new Schema<ShippingAddress>({
	name: { type: String, required: true },
	address: { type: String, required: true },
	city: { type: String, required: true },
	country: { type: String, required: true },
	postcode: { type: String, required: true },
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
		paymentStatus: {
			type: String,
			enum: ["Pending", "Paid", "Failed"],
			default: "Pending",
		},
		paymentConfirmed: { type: Boolean, default: false },
		shippingAddress: { type: ShippingAddressSchema, required: true },
		paymentMethod: { type: PaymentMethodSchema, required: true },
		createdAt: { type: Date, default: Date.now },
		carrierCode: { type: String },
		serviceCode: { type: String },
		trackingNumber: { type: String },
		labelId: { type: String },
		labelUrl: { type: String },
		packageInfo: { type: Object },
		pickupInfo: { type: Object },
		orderStatus: {
			type: String,
			enum: ["OrderConfirmed", "ItemShipped", "InTransit" ,  "Delivered", "SalesProceeds"],
			default: "OrderConfirmed",
		},
		status: {
			type: String,
			enum: [
				"OrderConfirmed",
				"LabelCreated",
				"PickedUp",
				"InTransit",
				"OutForDelivery",
				"Delivered",
				"SalesProceeds",
			],
			default: "OrderConfirmed",
		},
		tags: { type: [String], default: [] },
	},
	{ timestamps: true },
);

export default mongoose.model<IOrderDocument>("Order", OrderSchema);
