import {connectDatabase} from './database.mjs';
import {snapshot, saveSnapshot} from './storage.mjs';

const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randomTime = (fromHour, toHour) => {
  const hour = fromHour + Math.floor(Math.random() * (toHour - fromHour));
  const minute = pick([0, 15, 30, 45]);
  return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
};
const randomDays = () => {
  const count = 5 + Math.floor(Math.random() * 3); // 5 to 7 active days
  const shuffled = [...weekdays].sort(() => Math.random() - 0.5);
  return weekdays.filter(d => shuffled.slice(0, count).includes(d));
};

const db = await connectDatabase();
await db.transaction(async tx => {
  const {data} = await snapshot(tx);
  for (const restaurant of data.catalog.restaurants) {
    restaurant.scheduleDays = randomDays();
    restaurant.scheduleOpen = randomTime(7, 11);
    restaurant.scheduleClose = randomTime(20, 24);
  }
  await saveSnapshot(tx, data);
  console.log('Horaires générés pour', data.catalog.restaurants.length, 'restaurant(s) :');
  for (const r of data.catalog.restaurants) console.log(' -', r.name, ':', r.scheduleDays.join(','), r.scheduleOpen, '-', r.scheduleClose);
});
await db.close();
