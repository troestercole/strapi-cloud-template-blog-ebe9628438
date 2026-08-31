'use strict';

/**
 * Adds ownership columns to every collection type's list view.
 *
 * Strapi already records createdBy/updatedBy on every entry (they are injected
 * automatically, which is why they appear in types/generated/contentTypes.d.ts
 * but in no schema.json) and the edit view's information panel already shows
 * "Created <date> by <name>". The list view supports the same two columns but
 * ships with a default 4-column layout that omits them, so this adds them.
 *
 * The layout is stored per content type in strapi_core_store_settings. Writing
 * it here keeps it reproducible across environments, the same way sync.js does
 * for roles. Content-manager's own layout sync only strips fields that are not
 * listable, and createdBy/updatedBy both are, so this survives restarts.
 *
 * Entries created through the REST API (an API token, the data seeder) have no
 * admin user attached and render as "-". That is inherent: a token is not a
 * person.
 */

const OWNERSHIP_COLUMNS = ['updatedAt', 'updatedBy'];

async function addColumns(strapi, uid) {
  const contentTypeService = strapi.plugin('content-manager').service('content-types');
  const contentType = strapi.contentType(uid);

  const configuration = await contentTypeService.findConfiguration(contentType);
  const list = configuration.layouts?.list ?? [];

  const missing = OWNERSHIP_COLUMNS.filter((column) => !list.includes(column));
  if (missing.length === 0) return false;

  await contentTypeService.updateConfiguration(contentType, {
    ...configuration,
    layouts: {
      ...configuration.layouts,
      list: [...list, ...missing],
    },
  });

  return true;
}

module.exports = async (strapi) => {
  const uids = Object.keys(strapi.contentTypes).filter(
    (uid) => uid.startsWith('api::') && strapi.contentTypes[uid].kind === 'collectionType'
  );

  const updated = [];

  for (const uid of uids) {
    try {
      if (await addColumns(strapi, uid)) updated.push(uid);
    } catch (error) {
      strapi.log.error(
        `[admin-roles] failed to add ownership columns to ${uid}: ${error.message}`
      );
    }
  }

  if (updated.length > 0) {
    strapi.log.info(
      `[admin-roles] added ${OWNERSHIP_COLUMNS.join('/')} columns to ${updated.length} list view(s)`
    );
  }
};
