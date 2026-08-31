'use strict';

/**
 * Department-scoped admin panel roles.
 *
 * THIS FILE IS THE SOURCE OF TRUTH. It is applied on every boot by
 * ./sync.js, so any permission change made by hand in
 * Settings -> Administration Panel -> Roles will be reverted on the next
 * restart. Edit roles here, not in the UI. (Set ADMIN_ROLES_SYNC=false to
 * temporarily disable the sync while experimenting in the UI.)
 *
 * Each definition grants create/read/update on the listed content types, plus
 * delete and publish depending on the flags. Media Library access is granted
 * to every role; nothing else is. Roles never get Settings or Users & Roles
 * permissions -- see the escalation note in sync.js.
 *
 * Fields:
 *   name          Display name in the admin panel. Must be unique.
 *   code          Stable identifier used to find the role on re-runs.
 *                 Never change this once a role exists in production; changing
 *                 it orphans the old role and creates a new empty one.
 *   contentTypes  Content type UIDs this role may work with.
 *   canPublish    false = the role can save drafts but someone else publishes.
 *   canDelete     false = the role can create and edit but never delete.
 *   ownEntriesOnly    true = restrict read/update/delete to entries the user
 *                     created (applies the admin::is-creator condition).
 *   editOwnAssetsOnly true = the role can see and reuse every asset in the
 *                     Media Library, but can only edit/replace/delete the ones
 *                     it uploaded itself.
 */

module.exports = [
  {
    name: 'City Clerk',
    code: 'city-clerk',
    description:
      'Manages city updates, the community calendar, and government documents.',
    contentTypes: [
      'api::city-general-update.city-general-update',
      'api::city-event-update.city-event-update',
      'api::event.event',
      'api::government-document.government-document',
    ],
    canPublish: true,
    canDelete: true,
    ownEntriesOnly: false,
    editOwnAssetsOnly: true,
  },
  {
    name: 'Fire & EMS Editor',
    code: 'fire-ems-editor',
    description: 'Manages Fire & EMS updates and the department roster.',
    contentTypes: [
      'api::fire-ems-update.fire-ems-update',
      'api::member.member',
    ],
    canPublish: true,
    canDelete: true,
    ownEntriesOnly: false,
    editOwnAssetsOnly: true,
  },
  {
    name: 'Library Editor',
    code: 'library-editor',
    description: 'Manages library updates.',
    contentTypes: ['api::library-update.library-update'],
    canPublish: true,
    canDelete: true,
    ownEntriesOnly: false,
    editOwnAssetsOnly: true,
  },
  {
    name: 'Business Directory Editor',
    code: 'business-directory-editor',
    description: 'Manages the business and services directory.',
    contentTypes: ['api::business.business'],
    canPublish: true,
    canDelete: true,
    ownEntriesOnly: false,
    editOwnAssetsOnly: true,
  },
];
