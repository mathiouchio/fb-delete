const date = {
  today: new Date(),
  get currentYear() {
    return this.today.getFullYear();
  }
};

module.exports = date;
