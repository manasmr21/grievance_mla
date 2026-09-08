import { api, getApiError } from './axios.services';

/**
 * Backend menu API — returns role-specific navigation tree.
 *
 * @typedef {Object} MenuTreeNode
 * @property {string} code
 * @property {string} label
 * @property {string|null} path
 * @property {string} icon
 * @property {MenuTreeNode[]} [children]
 *
 * @typedef {Object} RoleMenuResponse
 * @property {string} roleCode
 * @property {MenuTreeNode[]} items
 * @property {string[]} allowedPaths
 */

/**
 * Fetch role-specific menu tree from backend.
 * @param {string} roleCode - e.g. 'ADMIN', 'HOD'
 * @returns {Promise<RoleMenuResponse>}
 */
export const getMyMenu = async (roleCode) => {
  try {
    const { data } = await api.get('/menus/me', {
      params: { roleCode },
      withCredentials: true,
    });
    return data?.data ?? data;
  } catch (error) {
    throw getApiError(error);
  }
};

export default { getMyMenu };
