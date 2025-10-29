import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fetchCharityRealCategories } from './fetchCharityRealCategories';
import { startAutoRefresh } from '../utils/ebayAuth';

dotenv.config();
startAutoRefresh();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/angelpage';

const PRE_SELECTED = [
  {
    name: 'British Heart Foundation',
    seller: 'bhf_shops',
    charity_ids: '225971',
  },
  { name: 'Oxfam', seller: 'oxfam_ebay_shop', charity_ids: '202918' },
  {
    name: 'Cancer Research UK',
    seller: 'cancerresearchukshop',
    charity_ids: '1089464',
  },
  {
    name: 'British Red Cross',
    seller: 'britishredcross',
    charity_ids: '220949',
  },
  {
    name: 'Children’s Society',
    seller: 'the_childrens_society',
    charity_ids: '221124',
  },
  {
    name: 'Royal British Legion Industries',
    seller: 'theroyalbritishlegion',
    charity_ids: '210063',
  },
  { name: 'Sense', seller: 'sensecharityretail', charity_ids: '289868' },
  { name: 'PDSA', seller: 'pdsa_charity', charity_ids: '208217' },
  { name: "Barnardo's", seller: 'barnardos_charity', charity_ids: '216250' },
  { name: 'Age UK', seller: 'ageuk', charity_ids: '1128267' },
  { name: 'Sue Ryder', seller: 'sueryderpre-loved', charity_ids: '1052076' },
  { name: 'Marie Curie', seller: 'mariecurietrading', charity_ids: '207994' },
];

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const c of PRE_SELECTED) {
    try {
      await fetchCharityRealCategories(c.seller, c.charity_ids);
    } catch {
      console.error(`❌ Failed for ${c.name}`);
    }

    console.log('⏳ Waiting 20 seconds before next charity...');
    await new Promise(r => setTimeout(r, 20000));
  }

  await mongoose.connection.close();
  console.log('🏁 All charities done.');
})();
