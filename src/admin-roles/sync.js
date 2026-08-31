'use strict';

/**
 * Applies ./definitions.js to the admin panel's roles on boot.
 *
 * Roles live in the database, not in code, so they do not survive a rebuilt
 * database and do not travel between environments. This module makes
 * definitions.js the source of truth instead: it creates any missing role and
 * re-applies its permission set on every boot.
 *
 * Safe to run repeatedly -- roles are matched by their stable `code`, and
 * admin::role.assignPermissions diffs against what is already stored rather
 * than appending.
 */

const definitions = require('./definitions');

const EXPLORER = 'plugin::content-manager.explorer';

const CONTENT_ACTIONS = {
  create: `${EXPLORER}.create`,
  read: `${EXPLORER}.read`,
  update: `${EXPLORER}.update`,
  delete: `${EXPLORER}.delete`,
  publish: `${EXPLORER}.publish`,
};

const IS_CREATOR = 'admin::is-creator';

/**
 * Never build a permission outside these namespaces.
 *
 * A role that can reach admin::roles.*, admin::users.* or
 * admin::api-tokens.* can grant itself everything, so this list is a hard
 * backstop against a definition (or a future edit to this file) opening an
 * escalation path. plugin::content-manager.*.configure-view is excluded too:
 * it rewrites the list/edit layout for every user, not just the role holder.
 */
const ALLOWED_ACTION_PREFIXES = [`${EXPLORER}.`, 'plugin::upload.'];

/**
 * Media Library access. Mirrors the grant Strapi gives its own built-in Author
 * role, with one deliberate difference: `read` is unconditional so editors can
 * see and reuse shared assets (the city logo, letterheads). Only
 * assets.update -- which covers replace *and* delete -- is restricted to the
 * uploader. `configure-view` and the settings page are never granted.
 */
function mediaPermissions({ editOwnAssetsOnly }) {
  const conditions = editOwnAssetsOnly ? [IS_CREATOR] : [];

  return [
    { action: 'plugin::upload.read', conditions: [] },
    { action: 'plugin::upload.assets.create', conditions: [] },
    { action: 'plugin::upload.assets.update', conditions },
    { action: 'plugin::upload.assets.download', conditions: [] },
    { action: 'plugin::upload.assets.copy-link', conditions: [] },
  ];
}

/**
 * Build the content-manager permissions for one role.
 *
 * getPermissionsWithNestedFields is the helper Strapi itself uses to seed the
 * default Editor and Author roles. It fills in `properties.fields` with every
 * field path the role may touch, including nested component paths -- getting
 * that list wrong silently hides fields in the edit view, so it is not worth
 * hand-rolling.
 */
function contentPermissions(strapi, definition) {
  const contentTypeService = strapi.service('admin::content-type');
  const permissionService = strapi.service('admin::permission');

  const contentTypeActions = permissionService.actionProvider
    .values()
    .filter((action) => action.section === 'contentTypes');

  const excluded = new Set();
  if (!definition.canPublish) excluded.add(CONTENT_ACTIONS.publish);
  if (!definition.canDelete) excluded.add(CONTENT_ACTIONS.delete);

  const wanted = new Set(definition.contentTypes);

  return contentTypeService
    .getPermissionsWithNestedFields(contentTypeActions, {
      restrictedSubjects: ['plugin::users-permissions.user'],
    })
    .filter(({ subject }) => wanted.has(subject))
    .filter(({ action }) => !excluded.has(action))
    .map((permission) => ({
      ...permission,
      conditions: definition.ownEntriesOnly ? [IS_CREATOR] : [],
    }));
}

/**
 * Warn about UIDs that do not resolve to a real content type. Without this a
 * typo produces a role with no content permissions at all and no explanation.
 */
function reportUnknownContentTypes(strapi, definition) {
  const unknown = definition.contentTypes.filter(
    (uid) => !strapi.contentTypes[uid]
  );

  if (unknown.length > 0) {
    strapi.log.warn(
      `[admin-roles] "${definition.name}" references unknown content type(s): ${unknown.join(
        ', '
      )}`
    );
  }
}

async function findOrCreateRole(strapi, definition) {
  const roleService = strapi.service('admin::role');

  const existing = await roleService.findOne({ code: definition.code });
  if (existing) return existing;

  // A role with this name but a different code means someone created it by
  // hand. Adopting it would be guesswork, and create() would throw on the
  // duplicate name, so say so plainly and skip.
  const nameClash = await roleService.findOne({ name: definition.name });
  if (nameClash) {
    strapi.log.warn(
      `[admin-roles] a role named "${definition.name}" already exists with code "${nameClash.code}" ` +
        `(expected "${definition.code}"). Skipping -- rename or delete it in the admin panel, ` +
        `or set its code in definitions.js.`
    );
    return null;
  }

  const created = await roleService.create({
    name: definition.name,
    code: definition.code,
    description: definition.description,
  });

  strapi.log.info(`[admin-roles] created role "${definition.name}"`);
  return created;
}

async function syncRole(strapi, definition) {
  reportUnknownContentTypes(strapi, definition);

  const role = await findOrCreateRole(strapi, definition);
  if (!role) return;

  const permissions = [
    ...contentPermissions(strapi, definition),
    ...mediaPermissions(definition),
  ].filter(({ action }) =>
    ALLOWED_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix))
  );

  await strapi.service('admin::role').assignPermissions(role.id, permissions);

  strapi.log.info(
    `[admin-roles] synced "${definition.name}": ${permissions.length} permissions across ` +
      `${definition.contentTypes.length} content type(s)`
  );
}

module.exports = async (strapi) => {
  if (process.env.ADMIN_ROLES_SYNC === 'false') {
    strapi.log.info('[admin-roles] sync disabled via ADMIN_ROLES_SYNC=false');
    return;
  }

  for (const definition of definitions) {
    try {
      await syncRole(strapi, definition);
    } catch (error) {
      // One bad definition should not stop the app from booting.
      strapi.log.error(
        `[admin-roles] failed to sync "${definition.name}": ${error.message}`
      );
    }
  }
};
