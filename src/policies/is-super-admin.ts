// src/policies/is-super-admin.ts

import { Context as KoaContext } from 'koa';

// Esta política verifica si el usuario autenticado tiene el rol 'Super Admin'.
export default async (ctx: KoaContext, config: any, { strapi }: { strapi: any }) => { // strapi: any para compatibilidad
  const user = ctx.state.user; // El usuario autenticado está en ctx.state.user

  if (!user) {
    // Si no hay usuario autenticado, deniega el acceso
    (strapi as any).log.warn('Policy is-super-admin: Acceso denegado. Usuario no autenticado.');
    return false;
  }

  // Obtener los roles del usuario y verificar si tiene el rol 'Super Admin'.
  // Asumimos que los roles vienen poblados en el objeto de usuario.
  const roles = user.roles || [];
  const isSuperAdmin = roles.some((role: any) => role.name === 'Super Admin');

  if (isSuperAdmin) {
    // Si el usuario es Super Admin, permite el acceso
    (strapi as any).log.info(`Policy is-super-admin: Acceso permitido para usuario ${user.id} (Super Admin).`);
    return true;
  }

  // Si no es Super Admin, deniega el acceso
  (strapi as any).log.warn(`Policy is-super-admin: Acceso denegado para usuario ${user.id}. No tiene el rol 'Super Admin'.`);
  return false;
};
