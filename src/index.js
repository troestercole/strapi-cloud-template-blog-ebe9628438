'use strict';
const seedExampleApp = require("./bootstrap");
const syncAdminRoles = require("./admin-roles/sync");
const syncListViews = require("./admin-roles/list-view");

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   *
   * Runs after every plugin has bootstrapped, so the admin permission actions
   * that syncAdminRoles reads are fully registered by this point.
   */
  async bootstrap({ strapi }) {
    await seedExampleApp();
    await syncAdminRoles(strapi);
    await syncListViews(strapi);
  },
};
