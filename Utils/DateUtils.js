const { CustomError } = require("../Middleware/CustomeError");
const { DateTime } = require("luxon");

function formatDateOnly(isoString) {

  if (!isoString) return null;

  const date = new Date(isoString);
  if (isNaN(date)) return null; // Check if date is invalid

  return date.toISOString().split("T")[0];
}

// utils/dateFormatter.js

function formatAppointments(rows) {
  return rows.data.map((app) => {
    const formatted = { ...app };

    if (app.appointment_date) {
      const appointmentDate = new Date(app.appointment_date);
      formatted.appointment_date = appointmentDate.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    }

    if (app.date_of_birth) {
      const dob = new Date(app.date_of_birth);
      formatted.date_of_birth = dob.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    }

    // if (app.start_date) {
    //   const dob = new Date(app.start_date);
    //   formatted.start_date = dob.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    // }

    // if (app.end_date) {
    //   const dob = new Date(app.end_date);
    //   formatted.end_date = dob.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    // }

    return formatted;
  });
}

function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isoToSqlDatetime(isoStr) {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date string");
  }

  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const DD = String(date.getDate()).padStart(2, "0");

  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

const compareDateTime = async (d1, t1, d2, t2) => {
  const datetime1 = new Date(`${d1}T${t1}`);
  const datetime2 = new Date(`${d2}T${t2}`);



  const millis1 = datetime1.getTime();
  const millis2 = datetime2.getTime();



  if (millis1 > millis2) {
    throw new CustomError(`${d1} ${t1} is later than ${d2} ${t2}`, 400);

    // if (millis1 < millis2) {
    //   return `${d1} ${t1} is earlier than ${d2} ${t2}`;
    // } else if (millis1 > millis2) {
    //   return `${d1} ${t1} is later than ${d2} ${t2}`;
    // } else {
    //   return `${d1} ${t1} is the same as ${d2} ${t2}`;
    // }
  }
};

function isEarlier(dt1, dt2) {
  return new Date(dt1) < new Date(dt2);
}

/**
 * Converts an ISO UTC string to system local time (region-based)
 * @param {string} utcISOString - ISO string like "2025-06-20T07:27:11.000Z"
 * @returns {string} - Local time in "YYYY-MM-DD HH:mm:ss" format
 */
function convertUTCToLocal(utcISOString) {
  const date = new Date(utcISOString); // auto converts UTC to local

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

const dayjs = require('dayjs');

//Check UserInputDatetime < now()

// const appointmentDate = "2025-04-06";
// const startTime = "09:00";

function checkPreviousDatetimeOrNot(date, time) {
  const inputDateTime = dayjs(`${date} ${time}`);
  const now = dayjs();

  if (!inputDateTime.isValid()) {
    throw new Error("Invalid date or time format");
  }

  return inputDateTime.isSameOrAfter(now, 'minute');
}

function getSystemTimeOnly() {
  const now = new Date();
  return now.toTimeString().split(" ")[0]; // returns 'HH:MM:SS'
}




module.exports = {
  formatDateOnly,
  formatAppointments,
  isValidDate,
  isoToSqlDatetime,
  compareDateTime,
  isEarlier,
  convertUTCToLocal,
  checkPreviousDatetimeOrNot,
  getSystemTimeOnly
};
