'use strict';

/**
 * Factory for the four "-update" content types, which all share the same
 * schema (title, body, date, cta_label, cta_url, pinned, archived, image).
 *
 * Usage:
 *   const { buildUpdate, buildUpdateList, createUpdate } = require('../factories/update.factory');
 *
 *   // Plain data object (no Strapi needed):
 *   const data = buildUpdate({ pinned: true });
 *
 *   // Persisted document (needs a running Strapi instance):
 *   const doc = await createUpdate(strapi, 'library-update', { title: 'Storytime' });
 */

const UPDATE_KINDS = [
  'city-event-update',
  'city-general-update',
  'fire-ems-update',
  'library-update',
];

const UPDATE_UIDS = Object.fromEntries(
  UPDATE_KINDS.map((kind) => [kind, `api::${kind}.${kind}`])
);

let sequence = 0;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build attribute data for any -update type. Every field can be overridden;
 * pass `date: undefined` to let the beforeCreate lifecycle fill it in.
 */
function buildUpdate(overrides = {}) {
  sequence += 1;
  return {
    title: `Test Update ${sequence}`,
    body: `Body text for test update ${sequence}.`,
    date: todayISO(),
    cta_label: null,
    cta_url: null,
    pinned: false,
    archived: false,
    ...overrides,
  };
}

/** Build `count` data objects, applying the same overrides to each. */
function buildUpdateList(count, overrides = {}) {
  return Array.from({ length: count }, () => buildUpdate(overrides));
}

// Common variants, so tests read as intent rather than field soup.
const buildPinnedUpdate = (overrides = {}) => buildUpdate({ pinned: true, ...overrides });
const buildArchivedUpdate = (overrides = {}) => buildUpdate({ archived: true, ...overrides });
const buildUpdateWithCta = (overrides = {}) =>
  buildUpdate({ cta_label: 'Learn more', cta_url: 'https://example.com', ...overrides });

function uidFor(kind) {
  const uid = UPDATE_UIDS[kind];
  if (!uid) {
    throw new Error(
      `Unknown update kind "${kind}". Expected one of: ${UPDATE_KINDS.join(', ')}`
    );
  }
  return uid;
}

/**
 * Create a persisted document via the Documents API.
 * @param {object} strapi - running Strapi instance
 * @param {string} kind - one of UPDATE_KINDS
 * @param {object} overrides - attribute overrides
 * @param {{ status?: 'draft' | 'published' }} options - defaults to published
 */
async function createUpdate(strapi, kind, overrides = {}, { status = 'published' } = {}) {
  return strapi.documents(uidFor(kind)).create({
    data: buildUpdate(overrides),
    status,
  });
}

/** Create `count` documents of one kind. */
async function createUpdateList(strapi, kind, count, overrides = {}, options = {}) {
  const docs = [];
  for (let i = 0; i < count; i += 1) {
    docs.push(await createUpdate(strapi, kind, overrides, options));
  }
  return docs;
}

/** Create one document of every -update kind; returns { [kind]: document }. */
async function createUpdateForEachKind(strapi, overrides = {}, options = {}) {
  const result = {};
  for (const kind of UPDATE_KINDS) {
    result[kind] = await createUpdate(strapi, kind, overrides, options);
  }
  return result;
}

/** Delete all documents of every -update kind (test cleanup). */
async function clearAllUpdates(strapi) {
  for (const kind of UPDATE_KINDS) {
    const uid = uidFor(kind);
    const docs = await strapi.documents(uid).findMany({ status: 'draft' });
    for (const doc of docs) {
      await strapi.documents(uid).delete({ documentId: doc.documentId });
    }
  }
}

module.exports = {
  UPDATE_KINDS,
  UPDATE_UIDS,
  buildUpdate,
  buildUpdateList,
  buildPinnedUpdate,
  buildArchivedUpdate,
  buildUpdateWithCta,
  createUpdate,
  createUpdateList,
  createUpdateForEachKind,
  clearAllUpdates,
};
