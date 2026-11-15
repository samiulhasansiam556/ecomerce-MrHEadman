
export const ROLES = ['customer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];


export const ACTIVE_STATUSES = [
  'active',
  'hidden',
  'archived',
] as const;

export type ActiveStatus =
  (typeof ACTIVE_STATUSES)[number];

export const AUDIENCES = [
  'men',
  'women',
  'kids',
  'general',
] as const;

export type Audience =
  (typeof AUDIENCES)[number];


  export const ATTRIBUTE_INPUT_TYPES = [
  'text',
  'number',
  'select',
  'multiselect',
  'color',
  'boolean',
] as const;

export type AttributeInputType =
  (typeof ATTRIBUTE_INPUT_TYPES)[number];

  export const OPTION_SET_TYPES = [
  'text',
  'color',
] as const;

export type OptionSetType =
  (typeof OPTION_SET_TYPES)[number];