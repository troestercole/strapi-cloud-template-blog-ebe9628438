'use strict';
module.exports = {
  beforeCreate(event) {
    const { data } = event.params;
    if (!data.date) {
      data.date = new Date().toISOString().slice(0, 10);
    }
  },
};
