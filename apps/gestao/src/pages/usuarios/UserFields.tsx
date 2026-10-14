import type { Role } from '@avaliacoes/schemas';
import type { Sector } from '../../api/sectors';
import { roleLabels } from '../../auth/session';
import { input } from '../../components/ui/styles';

// Campos de perfil e setor, usados no cadastro e na edição de usuários (RN16).
// Super admin escolhe qualquer perfil; admin de setor só cria visualizadores do próprio setor.
export default function UserFields({
  idPrefix,
  myRole,
  role,
  sectorId,
  sectors,
  onRoleChange,
  onSectorChange,
}: {
  idPrefix: string;
  myRole: Role;
  role: Role;
  sectorId: number | null;
  sectors: Sector[];
  onRoleChange: (role: Role) => void;
  onSectorChange: (sectorId: number | null) => void;
}) {
  const roles: Role[] = myRole === 'SUPER_ADMIN' ? ['SUPER_ADMIN', 'SECTOR_ADMIN', 'VIEWER'] : ['VIEWER'];

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-role`} className="block font-bold">
          Perfil
        </label>
        <select
          id={`${idPrefix}-role`}
          value={role}
          disabled={roles.length === 1}
          onChange={(event) => onRoleChange(event.target.value as Role)}
          className={`mt-1 ${input}`}
        >
          {roles.map((option) => (
            <option key={option} value={option}>
              {roleLabels[option]}
            </option>
          ))}
        </select>
      </div>

      {/* O super admin não tem setor (RN16) */}
      {role !== 'SUPER_ADMIN' && (
        <div>
          <label htmlFor={`${idPrefix}-sector`} className="block font-bold">
            Setor
          </label>
          <select
            id={`${idPrefix}-sector`}
            value={sectorId ?? ''}
            disabled={myRole !== 'SUPER_ADMIN'}
            onChange={(event) => onSectorChange(event.target.value ? Number(event.target.value) : null)}
            className={`mt-1 ${input}`}
          >
            <option value="">Escolha o setor</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
                {sector.active ? '' : ' (inativo)'}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
