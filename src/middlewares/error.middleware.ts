import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
	status?: number;
}

const errorHandler = (
	err: CustomError,
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const statusCode = err.status || 500;
	const isDevelopment = process.env.NODE_ENV === "development";

	console.error("Error Message:", err.message);
	console.error("Error Stack:", err.stack);

	const response = {
		status: statusCode,
		message:
			statusCode >= 500
				? "Internal Server Error"
				: err.message || "An error occurred",
		...(isDevelopment && { error: err.stack }),
	};

	res.status(statusCode).json(response);
};

export default errorHandler;
