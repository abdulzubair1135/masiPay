import mongoose from 'mongoose';
import { ENV } from './config/env.js';
import { CanteenSettings } from './models/CanteenSettings.js';

async function update() {
  await mongoose.connect(ENV.MONGODB_URI);
  await CanteenSettings.updateMany({}, {
    upiId: 'abdulzubair221-1@okaxis',
    upiPayeeName: 'Abdul Zubair'
  });
  console.log('✅ Successfully updated MongoDB CanteenSettings to abdulzubair221-1@okaxis');
  process.exit(0);
}

update();
