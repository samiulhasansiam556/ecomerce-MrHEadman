
import argon2 from 'argon2';

import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import UserModel from '../models/user.model';

async function createAdmin() {
  const name = env.ADMIN_NAME?.trim();
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const phone = env.ADMIN_PHONE?.trim();
  const password = env.ADMIN_PASSWORD;

  if (!name || !email || !phone || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE and ADMIN_PASSWORD are required',
    );
  }

  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw new Error('ADMIN_PHONE must be a valid Bangladesh phone number');
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error(
      'ADMIN_PASSWORD must contain at least one letter and one number',
    );
  }

  await connectDB();

  try {
    const existingUser = await UserModel.findOne({ email })
      .select('_id role');

    if (existingUser) {
      throw new Error(
        'This email already belongs to an account. No changes were made.',
      );
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const admin = await UserModel.create({
      name,
      email,
      phone,
      passwordHash,
      role: 'admin',
      status: 'active',
    });

    console.log('Admin created successfully:', {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });
  } finally {
    await disconnectDB();
  }
}

createAdmin().catch((error: unknown) => {
  console.error(
    'Admin bootstrap failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );

  process.exitCode = 1;
});
