const date = {
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  today: new Date(),
  get currentYear() {
    return this.today.getFullYear();
  }
};

module.exports = date;
