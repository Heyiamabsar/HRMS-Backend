import schedule from "node-schedule";
import moment from "moment-timezone";

const countries = [
  { name: "New York", tz: "America/New_York" },
  { name: "London", tz: "Europe/London" },
  { name: "Dubai", tz: "Asia/Dubai" },
  { name: "Sydney", tz: "Australia/Sydney" },
];

// ✅ function: calculate next 9:00 AM for a given timezone
function getNextNineAM(tz) {
  let next = moment.tz(tz).hour(9).minute(0).second(0).millisecond(0);

  // agar aaj ka 9:00 guzar chuka hai toh kal ka 9:00 set karo
  if (next.isBefore(moment.tz(tz))) {
    next.add(1, "day");
  }

  return next;
}

// ✅ function: schedule job for a country
function scheduleNineAM(country) {
  const nextNine = getNextNineAM(country.tz);

  console.log(
    `📅 Scheduling ${country.name} ka 9:00 AM at ${nextNine.format("YYYY-MM-DD HH:mm z")}`
  );

  schedule.scheduleJob(nextNine.toDate(), () => {
    console.log(`🔔 ${country.name} me abhi 9:00 AM hai! (India: ${nextNine.clone().tz("Asia/Kolkata").format("HH:mm")})`);

    // firse agla 9:00 schedule kar do
    scheduleNineAM(country);
  });
}

// ✅ sab countries ke liye job schedule start
countries.forEach(scheduleNineAM);
