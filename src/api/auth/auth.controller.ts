// src/api/auth/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../../models/User.model"; // For both users and charities
import Admin from "../../models/Admin.model";
import sendWelcomeEmail from "../email/email.service"; // Assume email service exists

export const registerUser = async (req: Request, res: Response) => {
	const { name, email, password, role } = req.body;

	if (!name || !email || !password) {
		return res.status(400).json({ message: "All fields are required." });
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const newUser = new User({ name, email, password: hashedPassword, role });

		await newUser.save();
		sendWelcomeEmail(email, role); // Trigger welcome email

		res
			.status(201)
			.json({
				message: "Registration successful. Please complete your profile.",
			});
	} catch (error) {
		return res.status(500).json({ message: "Error creating user." });
	}
};


export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email }) || await Admin.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (user.role === 'ADMIN') {
      // Specific handling for Admin users (e.g., force profile completion)
      if (!user.profileCompleted) {
        // Send response indicating the need to complete the profile
      }
    }
    
    // Update last login time for welcome-back emails
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({ message: "Login successful", role: user.role });
  } catch (error) {
    return res.status(500).json({ message: "Error during login." });
  }
};
